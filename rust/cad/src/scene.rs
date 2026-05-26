use std::collections::HashMap;

use parry2d_f64::shape::ConvexPolygon;
use serde::{Deserialize, Serialize};

use crate::boundary::Boundary;
use crate::collision::shapes_collide;
use crate::polygon::Polygon;
use crate::transform::Transform2D;

pub type ObjectId = u64;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShapeMetadata {
    pub name: Option<String>,
    pub color: Option<String>,
}

impl Default for ShapeMetadata {
    fn default() -> Self {
        Self { name: None, color: None }
    }
}

#[derive(Debug, Clone)]
pub struct PlacedShape {
    pub id: ObjectId,
    pub polygon: Polygon,
    pub convex_parts: Vec<ConvexPolygon>,
    pub transform: Transform2D,
    pub metadata: ShapeMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlacedShapeInfo {
    pub id: ObjectId,
    pub world_vertices: Vec<[f64; 2]>,
    pub transform: Transform2D,
    pub metadata: ShapeMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlacementError {
    CollidesWithObject { other_id: ObjectId },
    ExceedsBoundary,
    InvalidPolygon(String),
    ObjectNotFound(ObjectId),
}

impl std::fmt::Display for PlacementError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::CollidesWithObject { other_id } => write!(f, "Collides with object {other_id}"),
            Self::ExceedsBoundary => write!(f, "Shape exceeds room boundary"),
            Self::InvalidPolygon(msg) => write!(f, "Invalid polygon: {msg}"),
            Self::ObjectNotFound(id) => write!(f, "Object {id} not found"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub collisions: Vec<ObjectId>,
    pub exceeds_boundary: bool,
}

#[derive(Debug, Default)]
pub struct Scene {
    objects: HashMap<ObjectId, PlacedShape>,
    boundary: Option<Boundary>,
    next_id: ObjectId,
}

impl Scene {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set_boundary(&mut self, polygon: Polygon) {
        self.boundary = Some(Boundary::new(polygon));
    }

    pub fn add_shape(
        &mut self,
        polygon: Polygon,
        transform: Transform2D,
        metadata: ShapeMetadata,
    ) -> Result<ObjectId, PlacementError> {
        let result = self.validate_for(&polygon, &transform, None);
        if let Some(id) = result.collisions.first() {
            return Err(PlacementError::CollidesWithObject { other_id: *id });
        }
        if result.exceeds_boundary {
            return Err(PlacementError::ExceedsBoundary);
        }

        let id = self.next_id;
        self.next_id += 1;
        let convex_parts = polygon.to_convex_parts();
        self.objects.insert(id, PlacedShape { id, polygon, convex_parts, transform, metadata });
        Ok(id)
    }

    pub fn move_shape(
        &mut self,
        id: ObjectId,
        new_transform: Transform2D,
    ) -> Result<(), PlacementError> {
        let polygon = self
            .objects
            .get(&id)
            .map(|s| s.polygon.clone())
            .ok_or(PlacementError::ObjectNotFound(id))?;

        let result = self.validate_for(&polygon, &new_transform, Some(id));
        if let Some(other_id) = result.collisions.first() {
            return Err(PlacementError::CollidesWithObject { other_id: *other_id });
        }
        if result.exceeds_boundary {
            return Err(PlacementError::ExceedsBoundary);
        }

        self.objects.get_mut(&id).unwrap().transform = new_transform;
        Ok(())
    }

    pub fn remove_shape(&mut self, id: ObjectId) -> bool {
        self.objects.remove(&id).is_some()
    }

    /// Validate placement without modifying state (for drag preview).
    pub fn validate_placement(&self, polygon: &Polygon, transform: &Transform2D) -> ValidationResult {
        self.validate_for(polygon, transform, None)
    }

    /// Validate moving an existing shape to a new transform (excludes self from collision check).
    pub fn validate_move(&self, id: ObjectId, transform: &Transform2D) -> ValidationResult {
        match self.objects.get(&id) {
            Some(shape) => self.validate_for(&shape.polygon.clone(), transform, Some(id)),
            None => ValidationResult { valid: false, collisions: vec![], exceeds_boundary: false },
        }
    }

    fn validate_for(
        &self,
        polygon: &Polygon,
        transform: &Transform2D,
        exclude_id: Option<ObjectId>,
    ) -> ValidationResult {
        let mut collisions = Vec::new();
        let exceeds_boundary = self
            .boundary
            .as_ref()
            .map(|b| !b.contains_shape(polygon, transform))
            .unwrap_or(false);

        let new_parts = polygon.to_convex_parts();

        for (id, existing) in &self.objects {
            if exclude_id == Some(*id) {
                continue;
            }
            if shapes_collide(
                polygon,
                transform,
                &new_parts,
                &existing.polygon,
                &existing.transform,
                &existing.convex_parts,
            ) {
                collisions.push(*id);
            }
        }

        ValidationResult {
            valid: collisions.is_empty() && !exceeds_boundary,
            collisions,
            exceeds_boundary,
        }
    }

    pub fn get_shape_info(&self, id: ObjectId) -> Option<PlacedShapeInfo> {
        self.objects.get(&id).map(|s| {
            let world = s.polygon.transformed(&s.transform);
            PlacedShapeInfo {
                id: s.id,
                world_vertices: world.vertices().iter().map(|p| [p.x, p.y]).collect(),
                transform: s.transform.clone(),
                metadata: s.metadata.clone(),
            }
        })
    }

    pub fn all_shapes(&self) -> Vec<PlacedShapeInfo> {
        self.objects.values().map(|s| {
            let world = s.polygon.transformed(&s.transform);
            PlacedShapeInfo {
                id: s.id,
                world_vertices: world.vertices().iter().map(|p| [p.x, p.y]).collect(),
                transform: s.transform.clone(),
                metadata: s.metadata.clone(),
            }
        }).collect()
    }

    pub fn query_point(&self, x: f64, y: f64) -> Option<ObjectId> {
        for (id, shape) in &self.objects {
            let world = shape.polygon.transformed(&shape.transform);
            if world.contains_point(x, y) {
                return Some(*id);
            }
        }
        None
    }

    pub fn boundary(&self) -> Option<Vec<[f64; 2]>> {
        self.boundary.as_ref().map(|b| {
            b.polygon().vertices().iter().map(|p| [p.x, p.y]).collect()
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_two_non_overlapping_shapes() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(2.0, 2.0);
        let id1 = scene.add_shape(r.clone(), Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();
        let id2 = scene.add_shape(r, Transform2D::new(5.0, 0.0, 0.0), Default::default()).unwrap();
        assert_ne!(id1, id2);
    }

    #[test]
    fn add_overlapping_shape_fails() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(2.0, 2.0);
        scene.add_shape(r.clone(), Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();
        let err = scene.add_shape(r, Transform2D::new(0.5, 0.0, 0.0), Default::default());
        assert!(matches!(err, Err(PlacementError::CollidesWithObject { .. })));
    }

    #[test]
    fn shape_outside_boundary_fails() {
        let mut scene = Scene::new();
        scene.set_boundary(Polygon::rectangle(10.0, 10.0).transformed(&Transform2D::new(5.0, 5.0, 0.0)));
        let r = Polygon::rectangle(2.0, 2.0);
        let err = scene.add_shape(r, Transform2D::new(20.0, 20.0, 0.0), Default::default());
        assert!(matches!(err, Err(PlacementError::ExceedsBoundary)));
    }

    #[test]
    fn move_shape_into_collision_fails() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(2.0, 2.0);
        let id1 = scene.add_shape(r.clone(), Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();
        scene.add_shape(r, Transform2D::new(5.0, 0.0, 0.0), Default::default()).unwrap();
        let err = scene.move_shape(id1, Transform2D::new(5.0, 0.0, 0.0));
        assert!(matches!(err, Err(PlacementError::CollidesWithObject { .. })));
    }

    #[test]
    fn query_point_finds_shape() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(4.0, 4.0);
        let id = scene.add_shape(r, Transform2D::new(5.0, 5.0, 0.0), Default::default()).unwrap();
        assert_eq!(scene.query_point(5.0, 5.0), Some(id));
        assert_eq!(scene.query_point(20.0, 20.0), None);
    }

    #[test]
    fn validate_placement_reports_collision_without_mutating() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(2.0, 2.0);
        scene.add_shape(r.clone(), Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();

        let result = scene.validate_placement(&r, &Transform2D::new(0.5, 0.0, 0.0));
        assert!(!result.valid);
        assert!(!result.collisions.is_empty());
        // Scene must be unchanged — only one shape present
        assert_eq!(scene.all_shapes().len(), 1);
    }

    #[test]
    fn validate_move_does_not_self_collide() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(2.0, 2.0);
        let id = scene.add_shape(r, Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();
        // Moving to the same position must not flag the shape as colliding with itself
        let result = scene.validate_move(id, &Transform2D::new(0.0, 0.0, 0.0));
        assert!(result.valid);
        assert!(result.collisions.is_empty());
    }

    #[test]
    fn validate_move_still_detects_other_shapes() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(2.0, 2.0);
        let id1 = scene.add_shape(r.clone(), Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();
        scene.add_shape(r, Transform2D::new(5.0, 0.0, 0.0), Default::default()).unwrap();
        // Moving id1 into id2's position should fail validation
        let result = scene.validate_move(id1, &Transform2D::new(5.0, 0.0, 0.0));
        assert!(!result.valid);
        assert!(!result.collisions.is_empty());
    }

    #[test]
    fn remove_existing_shape_returns_true() {
        let mut scene = Scene::new();
        let id = scene.add_shape(Polygon::rectangle(2.0, 2.0), Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();
        assert!(scene.remove_shape(id));
        assert_eq!(scene.all_shapes().len(), 0);
    }

    #[test]
    fn remove_nonexistent_shape_returns_false() {
        let mut scene = Scene::new();
        assert!(!scene.remove_shape(999));
    }

    #[test]
    fn move_nonexistent_shape_returns_not_found() {
        let mut scene = Scene::new();
        let err = scene.move_shape(999, Transform2D::new(0.0, 0.0, 0.0));
        assert!(matches!(err, Err(PlacementError::ObjectNotFound(999))));
    }

    #[test]
    fn all_shapes_count_matches_additions() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(1.0, 1.0);
        for i in 0..4 {
            scene.add_shape(r.clone(), Transform2D::new(i as f64 * 3.0, 0.0, 0.0), Default::default()).unwrap();
        }
        assert_eq!(scene.all_shapes().len(), 4);
    }

    #[test]
    fn boundary_is_none_by_default_and_some_after_set() {
        let mut scene = Scene::new();
        assert!(scene.boundary().is_none());
        scene.set_boundary(Polygon::rectangle(10.0, 10.0).transformed(&Transform2D::new(5.0, 5.0, 0.0)));
        assert!(scene.boundary().is_some());
    }

    #[test]
    fn l_shaped_boundary_rejects_shape_in_cutout() {
        let mut scene = Scene::new();
        // l_shape(10,10,5,5): cutout at x∈[5,10], y∈[5,10]
        scene.set_boundary(Polygon::l_shape(10.0, 10.0, 5.0, 5.0));
        let shape = Polygon::rectangle(2.0, 2.0);
        // Centered at (8,8) — inside the cutout
        let err = scene.add_shape(shape.clone(), Transform2D::new(8.0, 8.0, 0.0), Default::default());
        assert!(matches!(err, Err(PlacementError::ExceedsBoundary)));
        // Centered at (2,2) — valid region
        let ok = scene.add_shape(shape, Transform2D::new(2.0, 2.0, 0.0), Default::default());
        assert!(ok.is_ok());
    }

    #[test]
    fn get_shape_info_returns_correct_id_and_vertex_count() {
        let mut scene = Scene::new();
        let r = Polygon::rectangle(2.0, 3.0);
        let vertex_count = r.vertices().len();
        let id = scene.add_shape(r, Transform2D::new(1.0, 1.0, 0.0), Default::default()).unwrap();
        let info = scene.get_shape_info(id).unwrap();
        assert_eq!(info.id, id);
        assert_eq!(info.world_vertices.len(), vertex_count);
    }
}
