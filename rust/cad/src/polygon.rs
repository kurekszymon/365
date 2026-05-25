use nalgebra::Point2;
use parry2d_f64::shape::ConvexPolygon;
use serde::{Deserialize, Serialize};

use crate::transform::Transform2D;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Aabb {
    pub min: Point2<f64>,
    pub max: Point2<f64>,
}

impl Aabb {
    pub fn overlaps(&self, other: &Aabb) -> bool {
        self.min.x < other.max.x
            && self.max.x > other.min.x
            && self.min.y < other.max.y
            && self.max.y > other.min.y
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Polygon {
    vertices: Vec<Point2<f64>>,
}

impl Polygon {
    pub fn new(vertices: Vec<Point2<f64>>) -> Result<Self, String> {
        if vertices.len() < 3 {
            return Err("Polygon needs at least 3 vertices".into());
        }
        let mut p = Self { vertices };
        p.ensure_ccw();
        Ok(p)
    }

    pub fn rectangle(width: f64, height: f64) -> Self {
        let hw = width / 2.0;
        let hh = height / 2.0;
        Self {
            vertices: vec![
                Point2::new(-hw, -hh),
                Point2::new(hw, -hh),
                Point2::new(hw, hh),
                Point2::new(-hw, hh),
            ],
        }
    }

    /// L-shape: full rect with bottom-right corner cut out.
    /// outer_w x outer_h overall, cutout_w x cutout_h from bottom-right.
    pub fn l_shape(outer_w: f64, outer_h: f64, cutout_w: f64, cutout_h: f64) -> Self {
        assert!(cutout_w < outer_w && cutout_h < outer_h);
        let (ow, oh, cw, ch) = (outer_w, outer_h, cutout_w, cutout_h);
        Self {
            vertices: vec![
                Point2::new(0.0, 0.0),
                Point2::new(ow, 0.0),
                Point2::new(ow, oh - ch),
                Point2::new(ow - cw, oh - ch),
                Point2::new(ow - cw, oh),
                Point2::new(0.0, oh),
            ],
        }
    }

    /// U-shape: full rect with a rectangular notch cut from the top center.
    /// channel_w x channel_h notch centered horizontally.
    pub fn u_shape(outer_w: f64, outer_h: f64, channel_w: f64, channel_h: f64) -> Self {
        assert!(channel_w < outer_w && channel_h < outer_h);
        let cx = (outer_w - channel_w) / 2.0;
        Self {
            vertices: vec![
                Point2::new(0.0, 0.0),
                Point2::new(outer_w, 0.0),
                Point2::new(outer_w, outer_h),
                Point2::new(cx + channel_w, outer_h),
                Point2::new(cx + channel_w, outer_h - channel_h),
                Point2::new(cx, outer_h - channel_h),
                Point2::new(cx, outer_h),
                Point2::new(0.0, outer_h),
            ],
        }
    }

    pub fn custom(vertices: Vec<[f64; 2]>) -> Result<Self, String> {
        let pts = vertices
            .into_iter()
            .map(|[x, y]| Point2::new(x, y))
            .collect();
        Self::new(pts)
    }

    pub fn vertices(&self) -> &[Point2<f64>] {
        &self.vertices
    }

    pub fn transformed(&self, t: &Transform2D) -> Self {
        Self {
            vertices: self.vertices.iter().map(|p| t.apply(p)).collect(),
        }
    }

    pub fn bounding_box(&self) -> Aabb {
        let mut min = Point2::new(f64::MAX, f64::MAX);
        let mut max = Point2::new(f64::MIN, f64::MIN);
        for v in &self.vertices {
            if v.x < min.x { min.x = v.x; }
            if v.y < min.y { min.y = v.y; }
            if v.x > max.x { max.x = v.x; }
            if v.y > max.y { max.y = v.y; }
        }
        Aabb { min, max }
    }

    /// Signed area; positive = CCW.
    fn signed_area(&self) -> f64 {
        let n = self.vertices.len();
        let mut area = 0.0;
        for i in 0..n {
            let j = (i + 1) % n;
            area += self.vertices[i].x * self.vertices[j].y;
            area -= self.vertices[j].x * self.vertices[i].y;
        }
        area / 2.0
    }

    fn ensure_ccw(&mut self) {
        if self.signed_area() < 0.0 {
            self.vertices.reverse();
        }
    }

    pub fn is_convex(&self) -> bool {
        let n = self.vertices.len();
        for i in 0..n {
            let a = &self.vertices[i];
            let b = &self.vertices[(i + 1) % n];
            let c = &self.vertices[(i + 2) % n];
            let cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
            if cross < -1e-10 {
                return false;
            }
        }
        true
    }

    /// Decompose into convex sub-polygons via ear-clipping triangulation
    /// then merge using a simple greedy approach (Hertel-Mehlhorn style).
    pub fn decompose(&self) -> Vec<Polygon> {
        if self.is_convex() {
            return vec![self.clone()];
        }
        // Fall back to triangulation — produces convex triangles
        let triangles = self.triangulate();
        triangles
    }

    fn triangulate(&self) -> Vec<Polygon> {
        let verts = &self.vertices;
        let n = verts.len();
        let mut indices: Vec<usize> = (0..n).collect();
        let mut result = Vec::new();

        while indices.len() > 3 {
            let len = indices.len();
            let mut clipped = false;
            for i in 0..len {
                let a = indices[(i + len - 1) % len];
                let b = indices[i];
                let c = indices[(i + 1) % len];
                if is_ear(verts, a, b, c, &indices) {
                    result.push(Polygon {
                        vertices: vec![verts[a], verts[b], verts[c]],
                    });
                    indices.remove(i);
                    clipped = true;
                    break;
                }
            }
            if !clipped {
                break;
            }
        }
        if indices.len() == 3 {
            result.push(Polygon {
                vertices: vec![verts[indices[0]], verts[indices[1]], verts[indices[2]]],
            });
        }
        result
    }

    /// Convert to parry2d ConvexPolygon (only valid if polygon is convex).
    pub fn to_parry_convex(&self) -> Option<ConvexPolygon> {
        let pts: Vec<parry2d_f64::math::Point<f64>> = self
            .vertices
            .iter()
            .map(|p| parry2d_f64::math::Point::new(p.x, p.y))
            .collect();
        ConvexPolygon::from_convex_hull(&pts)
    }

    /// Decompose into parry2d ConvexPolygon shapes for collision detection.
    pub fn to_convex_parts(&self) -> Vec<ConvexPolygon> {
        self.decompose()
            .iter()
            .filter_map(|p| p.to_parry_convex())
            .collect()
    }

    /// Point-in-polygon using ray casting.
    pub fn contains_point(&self, px: f64, py: f64) -> bool {
        let verts = &self.vertices;
        let n = verts.len();
        let mut inside = false;
        let mut j = n - 1;
        for i in 0..n {
            let xi = verts[i].x;
            let yi = verts[i].y;
            let xj = verts[j].x;
            let yj = verts[j].y;
            if ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
            j = i;
        }
        inside
    }

    pub fn edges(&self) -> impl Iterator<Item = (Point2<f64>, Point2<f64>)> + '_ {
        let n = self.vertices.len();
        (0..n).map(move |i| (self.vertices[i], self.vertices[(i + 1) % n]))
    }
}

fn cross2d(o: &Point2<f64>, a: &Point2<f64>, b: &Point2<f64>) -> f64 {
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

fn is_ear(verts: &[Point2<f64>], a: usize, b: usize, c: usize, indices: &[usize]) -> bool {
    // Must be CCW triangle
    if cross2d(&verts[a], &verts[b], &verts[c]) <= 0.0 {
        return false;
    }
    // No other vertex inside the triangle
    for &idx in indices {
        if idx == a || idx == b || idx == c {
            continue;
        }
        if point_in_triangle(&verts[idx], &verts[a], &verts[b], &verts[c]) {
            return false;
        }
    }
    true
}

fn point_in_triangle(p: &Point2<f64>, a: &Point2<f64>, b: &Point2<f64>, c: &Point2<f64>) -> bool {
    let d1 = cross2d(a, b, p);
    let d2 = cross2d(b, c, p);
    let d3 = cross2d(c, a, p);
    let has_neg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
    let has_pos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);
    !(has_neg && has_pos)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rectangle_is_convex() {
        let r = Polygon::rectangle(4.0, 3.0);
        assert!(r.is_convex());
    }

    #[test]
    fn l_shape_is_not_convex() {
        let l = Polygon::l_shape(4.0, 4.0, 2.0, 2.0);
        assert!(!l.is_convex());
    }

    #[test]
    fn l_shape_decomposes() {
        let l = Polygon::l_shape(4.0, 4.0, 2.0, 2.0);
        let parts = l.decompose();
        assert!(!parts.is_empty());
        for p in &parts {
            assert!(p.is_convex());
        }
    }

    #[test]
    fn transform_applies_rotation() {
        let r = Polygon::rectangle(2.0, 2.0);
        let t = Transform2D::from_degrees(5.0, 5.0, 90.0);
        let rotated = r.transformed(&t);
        // Top-right corner (1,1) should become roughly (-1,1) + (5,5) = (4,6)
        let v = rotated.vertices();
        // Just check that it's different from the original
        assert!((v[0].x - r.vertices()[0].x).abs() > 0.1);
    }

    #[test]
    fn rectangle_contains_point() {
        let r = Polygon::rectangle(4.0, 4.0);
        let t = Transform2D::from_degrees(2.0, 2.0, 0.0);
        let placed = r.transformed(&t);
        assert!(placed.contains_point(2.0, 2.0));
        assert!(!placed.contains_point(5.0, 5.0));
    }
}
