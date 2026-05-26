use parry2d_f64::{
    math::Isometry,
    query::intersection_test,
    shape::ConvexPolygon,
};

use crate::polygon::Polygon;
use crate::transform::Transform2D;

fn transform_to_isometry(t: &Transform2D) -> Isometry<f64> {
    Isometry::new(
        nalgebra::Vector2::new(t.translation.x, t.translation.y),
        t.rotation_rad,
    )
}

/// Returns true if two placed polygons (potentially concave) overlap.
pub fn shapes_collide(
    poly_a: &Polygon,
    transform_a: &Transform2D,
    parts_a: &[ConvexPolygon],
    poly_b: &Polygon,
    transform_b: &Transform2D,
    parts_b: &[ConvexPolygon],
) -> bool {
    // Broad phase: AABB check
    let world_a = poly_a.transformed(transform_a);
    let world_b = poly_b.transformed(transform_b);
    if !world_a.bounding_box().overlaps(&world_b.bounding_box()) {
        return false;
    }

    // Narrow phase: test all convex sub-part pairs
    let iso_a = transform_to_isometry(transform_a);
    let iso_b = transform_to_isometry(transform_b);

    for pa in parts_a {
        for pb in parts_b {
            if intersection_test(&iso_a, pa, &iso_b, pb).unwrap_or(false) {
                return true;
            }
        }
    }
    false
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::polygon::Polygon;
    use crate::transform::Transform2D;

    #[test]
    fn rectangles_collide_when_overlapping() {
        let r = Polygon::rectangle(2.0, 2.0);
        let parts = r.to_convex_parts();
        let t_a = Transform2D::new(0.0, 0.0, 0.0);
        let t_b = Transform2D::new(1.0, 0.0, 0.0); // overlaps
        assert!(shapes_collide(&r, &t_a, &parts, &r, &t_b, &parts));
    }

    #[test]
    fn rectangles_do_not_collide_when_apart() {
        let r = Polygon::rectangle(2.0, 2.0);
        let parts = r.to_convex_parts();
        let t_a = Transform2D::new(0.0, 0.0, 0.0);
        let t_b = Transform2D::new(5.0, 0.0, 0.0); // clearly separate
        assert!(!shapes_collide(&r, &t_a, &parts, &r, &t_b, &parts));
    }

    #[test]
    fn l_shapes_collide() {
        let l = Polygon::l_shape(4.0, 4.0, 2.0, 2.0);
        let parts = l.to_convex_parts();
        let t_a = Transform2D::new(0.0, 0.0, 0.0);
        let t_b = Transform2D::new(1.0, 0.0, 0.0);
        assert!(shapes_collide(&l, &t_a, &parts, &l, &t_b, &parts));
    }

    #[test]
    fn rectangles_exactly_touching_do_not_collide() {
        // 2×2 rectangles centered at (0,0) and (2,0): edges meet at x=1 but no overlap
        let r = Polygon::rectangle(2.0, 2.0);
        let parts = r.to_convex_parts();
        let t_a = Transform2D::new(0.0, 0.0, 0.0);
        let t_b = Transform2D::new(2.0, 0.0, 0.0);
        assert!(!shapes_collide(&r, &t_a, &parts, &r, &t_b, &parts));
    }

    #[test]
    fn l_shapes_far_apart_do_not_collide() {
        let l = Polygon::l_shape(4.0, 4.0, 2.0, 2.0);
        let parts = l.to_convex_parts();
        let t_a = Transform2D::new(0.0, 0.0, 0.0);
        let t_b = Transform2D::new(20.0, 20.0, 0.0);
        assert!(!shapes_collide(&l, &t_a, &parts, &l, &t_b, &parts));
    }

    #[test]
    fn rotated_rectangles_that_overlap_collide() {
        let r = Polygon::rectangle(4.0, 1.0);
        let parts = r.to_convex_parts();
        // One horizontal, one vertical — placed at origin both, cross in center
        let t_horiz = Transform2D::from_degrees(0.0, 0.0, 0.0);
        let t_vert = Transform2D::from_degrees(0.0, 0.0, 90.0);
        assert!(shapes_collide(&r, &t_horiz, &parts, &r, &t_vert, &parts));
    }
}
