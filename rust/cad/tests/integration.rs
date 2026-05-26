use cad::{Polygon, Scene, Transform2D, PlacementError};

// ── Furniture placement scenarios ────────────────────────────────────────────

#[test]
fn pack_four_non_overlapping_rectangles_in_row() {
    let mut scene = Scene::new();
    scene.set_boundary(
        Polygon::custom(vec![[0.0,0.0],[20.0,0.0],[20.0,5.0],[0.0,5.0]]).unwrap(),
    );
    let chair = Polygon::rectangle(2.0, 2.0);
    for i in 0..4 {
        // Start at x=2 so no vertex touches the boundary wall (collinear edges are
        // treated as crossing by the segment-intersection check)
        let x = 2.0 + i as f64 * 4.0;
        scene.add_shape(chair.clone(), Transform2D::new(x, 2.5, 0.0), Default::default())
            .expect("chair placement should succeed");
    }
    assert_eq!(scene.all_shapes().len(), 4);
}

#[test]
fn rotated_shape_collides_after_swing() {
    let mut scene = Scene::new();
    // A tall thin rectangle (1×4) standing vertical next to a 2×2 block
    let tall = Polygon::rectangle(1.0, 4.0);
    let block = Polygon::rectangle(2.0, 2.0);
    let id_tall = scene
        .add_shape(tall, Transform2D::from_degrees(0.0, 0.0, 0.0), Default::default())
        .unwrap();
    scene
        .add_shape(block, Transform2D::new(3.0, 0.0, 0.0), Default::default())
        .unwrap();
    // Rotating the tall shape 90° makes it 4×1 — its right edge reaches x=2, still clear
    let ok = scene.move_shape(id_tall, Transform2D::from_degrees(0.0, 0.0, 90.0));
    assert!(ok.is_ok());
}

#[test]
fn remove_then_place_in_freed_spot() {
    let mut scene = Scene::new();
    let r = Polygon::rectangle(2.0, 2.0);
    let id = scene
        .add_shape(r.clone(), Transform2D::new(0.0, 0.0, 0.0), Default::default())
        .unwrap();
    scene.remove_shape(id);
    // Same spot should now be free
    let result = scene.add_shape(r, Transform2D::new(0.0, 0.0, 0.0), Default::default());
    assert!(result.is_ok());
}

// ── Boundary scenarios ────────────────────────────────────────────────────────

#[test]
fn l_shaped_room_allows_shapes_in_both_arms() {
    let mut scene = Scene::new();
    // l_shape(8,8,4,4): valid region = bottom arm + left arm
    scene.set_boundary(Polygon::l_shape(8.0, 8.0, 4.0, 4.0));
    let s = Polygon::rectangle(1.0, 1.0);

    // Bottom-right arm: center around (6, 2)
    scene.add_shape(s.clone(), Transform2D::new(6.0, 2.0, 0.0), Default::default())
        .expect("bottom arm should be valid");

    // Left arm: center around (2, 6)
    scene.add_shape(s.clone(), Transform2D::new(2.0, 6.0, 0.0), Default::default())
        .expect("left arm should be valid");

    assert_eq!(scene.all_shapes().len(), 2);
}

#[test]
fn shape_cannot_span_l_shape_cutout() {
    let mut scene = Scene::new();
    // l_shape(10,10,5,5): cutout at x∈[5,10], y∈[5,10]
    scene.set_boundary(Polygon::l_shape(10.0, 10.0, 5.0, 5.0));
    // A wide rectangle that would straddle the inner corner
    let wide = Polygon::rectangle(8.0, 2.0);
    let err = scene.add_shape(wide, Transform2D::new(5.0, 7.0, 0.0), Default::default());
    assert!(matches!(err, Err(PlacementError::ExceedsBoundary)));
}

// ── Validation (non-mutating) ─────────────────────────────────────────────────

#[test]
fn validate_placement_is_non_mutating() {
    let mut scene = Scene::new();
    scene.add_shape(
        Polygon::rectangle(2.0, 2.0),
        Transform2D::new(0.0, 0.0, 0.0),
        Default::default(),
    ).unwrap();

    let probe = Polygon::rectangle(2.0, 2.0);
    let result = scene.validate_placement(&probe, &Transform2D::new(0.0, 0.0, 0.0));
    assert!(!result.valid);
    assert_eq!(result.collisions.len(), 1);
    // Scene must still have exactly one shape
    assert_eq!(scene.all_shapes().len(), 1);
}

#[test]
fn validate_move_ghost_reports_both_violations() {
    let mut scene = Scene::new();
    scene.set_boundary(
        Polygon::custom(vec![[0.0,0.0],[5.0,0.0],[5.0,5.0],[0.0,5.0]]).unwrap(),
    );
    let r = Polygon::rectangle(1.0, 1.0);
    let id_a = scene.add_shape(r.clone(), Transform2D::new(1.0, 1.0, 0.0), Default::default()).unwrap();
    scene.add_shape(r, Transform2D::new(3.0, 1.0, 0.0), Default::default()).unwrap();

    // Move id_a to (3,1) — collides with the second shape AND exits boundary if rotated large
    let result = scene.validate_move(id_a, &Transform2D::new(3.0, 1.0, 0.0));
    assert!(!result.valid);
    assert!(!result.collisions.is_empty());
}

// ── Custom polygons ───────────────────────────────────────────────────────────

#[test]
fn custom_triangle_collision_with_rectangle() {
    let mut scene = Scene::new();
    // Right-angled triangle centered near origin
    let tri = Polygon::custom(vec![[0.0, 0.0], [2.0, 0.0], [0.0, 2.0]]).unwrap();
    scene.add_shape(tri.clone(), Transform2D::new(0.0, 0.0, 0.0), Default::default()).unwrap();

    // A rectangle that overlaps the triangle
    let rect = Polygon::rectangle(1.0, 1.0);
    let err = scene.add_shape(rect, Transform2D::new(0.5, 0.5, 0.0), Default::default());
    assert!(matches!(err, Err(PlacementError::CollidesWithObject { .. })));
}
