use nalgebra::{Point2, Vector2};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transform2D {
    pub translation: Vector2<f64>,
    pub rotation_rad: f64,
}

impl Transform2D {
    pub fn identity() -> Self {
        Self {
            translation: Vector2::zeros(),
            rotation_rad: 0.0,
        }
    }

    pub fn new(x: f64, y: f64, rotation_rad: f64) -> Self {
        Self {
            translation: Vector2::new(x, y),
            rotation_rad,
        }
    }

    pub fn from_degrees(x: f64, y: f64, rotation_deg: f64) -> Self {
        Self::new(x, y, rotation_deg.to_radians())
    }

    pub fn apply(&self, point: &Point2<f64>) -> Point2<f64> {
        let cos = self.rotation_rad.cos();
        let sin = self.rotation_rad.sin();
        let rx = point.x * cos - point.y * sin;
        let ry = point.x * sin + point.y * cos;
        Point2::new(rx + self.translation.x, ry + self.translation.y)
    }
}

impl Default for Transform2D {
    fn default() -> Self {
        Self::identity()
    }
}
