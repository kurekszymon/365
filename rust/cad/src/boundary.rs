use nalgebra::Point2;

use crate::polygon::Polygon;
use crate::transform::Transform2D;

#[derive(Debug, Clone)]
pub struct Boundary {
    polygon: Polygon,
}

impl Boundary {
    pub fn new(polygon: Polygon) -> Self {
        Self { polygon }
    }

    pub fn polygon(&self) -> &Polygon {
        &self.polygon
    }

    /// Returns true if `shape` (after applying `transform`) is fully inside this boundary.
    pub fn contains_shape(&self, shape: &Polygon, transform: &Transform2D) -> bool {
        let world_shape = shape.transformed(transform);

        // All vertices of the placed shape must be inside the boundary
        for v in world_shape.vertices() {
            if !self.polygon.contains_point(v.x, v.y) {
                return false;
            }
        }

        // No edges of the placed shape may cross any boundary edge
        for (sa, sb) in world_shape.edges() {
            for (ba, bb) in self.polygon.edges() {
                if segments_intersect(&sa, &sb, &ba, &bb) {
                    return false;
                }
            }
        }

        true
    }
}

/// Returns true if segments (p1,p2) and (p3,p4) properly intersect.
fn segments_intersect(p1: &Point2<f64>, p2: &Point2<f64>, p3: &Point2<f64>, p4: &Point2<f64>) -> bool {
    let d1 = cross(p3, p4, p1);
    let d2 = cross(p3, p4, p2);
    let d3 = cross(p1, p2, p3);
    let d4 = cross(p1, p2, p4);

    if ((d1 > 0.0 && d2 < 0.0) || (d1 < 0.0 && d2 > 0.0))
        && ((d3 > 0.0 && d4 < 0.0) || (d3 < 0.0 && d4 > 0.0))
    {
        return true;
    }

    // Collinear cases
    if d1.abs() < 1e-12 && on_segment(p3, p4, p1) { return true; }
    if d2.abs() < 1e-12 && on_segment(p3, p4, p2) { return true; }
    if d3.abs() < 1e-12 && on_segment(p1, p2, p3) { return true; }
    if d4.abs() < 1e-12 && on_segment(p1, p2, p4) { return true; }

    false
}

fn cross(o: &Point2<f64>, a: &Point2<f64>, b: &Point2<f64>) -> f64 {
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

fn on_segment(p: &Point2<f64>, q: &Point2<f64>, r: &Point2<f64>) -> bool {
    r.x <= p.x.max(q.x) && r.x >= p.x.min(q.x)
        && r.y <= p.y.max(q.y) && r.y >= p.y.min(q.y)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::polygon::Polygon;
    use crate::transform::Transform2D;

    #[test]
    fn rect_inside_large_boundary() {
        let boundary = Boundary::new(Polygon::rectangle(100.0, 100.0).transformed(
            &Transform2D::new(50.0, 50.0, 0.0),
        ));
        // rectangle centered at origin
        let shape = Polygon::rectangle(4.0, 4.0);
        let t = Transform2D::new(50.0, 50.0, 0.0);
        assert!(boundary.contains_shape(&shape, &t));
    }

    #[test]
    fn rect_outside_boundary() {
        let boundary = Boundary::new(Polygon::rectangle(10.0, 10.0).transformed(
            &Transform2D::new(5.0, 5.0, 0.0),
        ));
        let shape = Polygon::rectangle(4.0, 4.0);
        let t = Transform2D::new(12.0, 5.0, 0.0); // outside
        assert!(!boundary.contains_shape(&shape, &t));
    }

    #[test]
    fn l_shape_boundary_blocks_corner() {
        // L-shape boundary: 10x10 with 5x5 cut from top-right
        let boundary = Boundary::new(Polygon::l_shape(10.0, 10.0, 5.0, 5.0));
        let shape = Polygon::rectangle(3.0, 3.0);
        let t = Transform2D::new(8.5, 8.5, 0.0);
        assert!(!boundary.contains_shape(&shape, &t));
        let t2 = Transform2D::new(2.0, 2.0, 0.0);
        assert!(boundary.contains_shape(&shape, &t2));
    }

    #[test]
    fn u_shape_boundary_blocks_notch() {
        // u_shape(10,10,4,4): notch at x∈[3,7], y∈[6,10]
        let boundary = Boundary::new(Polygon::u_shape(10.0, 10.0, 4.0, 4.0));
        let shape = Polygon::rectangle(1.0, 1.0);
        // Center at (5,8) — fully inside the notch, should be rejected
        let t_notch = Transform2D::new(5.0, 8.0, 0.0);
        assert!(!boundary.contains_shape(&shape, &t_notch));
        // Center at (1.5,1.5) — bottom-left corner, clearly inside
        let t_inside = Transform2D::new(1.5, 1.5, 0.0);
        assert!(boundary.contains_shape(&shape, &t_inside));
    }

    #[test]
    fn shape_straddling_boundary_edge_is_rejected() {
        // 10x10 boundary from (0,0) to (10,10)
        let boundary = Boundary::new(
            Polygon::rectangle(10.0, 10.0).transformed(&Transform2D::new(5.0, 5.0, 0.0)),
        );
        let shape = Polygon::rectangle(4.0, 4.0);
        // Centered at (9,5): x spans 7..11, right side exits boundary
        let t = Transform2D::new(9.0, 5.0, 0.0);
        assert!(!boundary.contains_shape(&shape, &t));
    }

    #[test]
    fn rotated_shape_fits_inside_large_boundary() {
        // 20x20 boundary centered at origin
        let boundary = Boundary::new(
            Polygon::rectangle(20.0, 20.0).transformed(&Transform2D::new(10.0, 10.0, 0.0)),
        );
        let shape = Polygon::rectangle(2.0, 2.0);
        // 45° rotation — diagonal ~2.83, still fits easily near center
        let t = Transform2D::from_degrees(10.0, 10.0, 45.0);
        assert!(boundary.contains_shape(&shape, &t));
    }
}
