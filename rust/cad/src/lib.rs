mod boundary;
mod collision;
mod polygon;
mod scene;
mod transform;

pub use polygon::{Aabb, Polygon};
pub use scene::{ObjectId, PlacedShapeInfo, PlacementError, Scene, ShapeMetadata, ValidationResult};
pub use transform::Transform2D;

use serde::Serialize;
use wasm_bindgen::prelude::*;

fn js_to_vertices(val: &JsValue) -> Result<Vec<[f64; 2]>, JsValue> {
    serde_wasm_bindgen::from_value(val.clone())
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

fn placement_err_to_js(e: PlacementError) -> JsValue {
    JsValue::from_str(&e.to_string())
}

#[wasm_bindgen]
pub struct CadEngine {
    scene: Scene,
}

#[wasm_bindgen]
impl CadEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { scene: Scene::new() }
    }

    /// Set the room boundary from [[x,y], ...] vertices.
    #[wasm_bindgen(js_name = "setBoundary")]
    pub fn set_boundary(&mut self, vertices: JsValue) -> Result<(), JsValue> {
        let verts = js_to_vertices(&vertices)?;
        let polygon = Polygon::custom(verts).map_err(|e| JsValue::from_str(&e))?;
        self.scene.set_boundary(polygon);
        Ok(())
    }

    /// Set a rectangular room boundary (origin at 0,0).
    #[wasm_bindgen(js_name = "setRectangularBoundary")]
    pub fn set_rectangular_boundary(&mut self, width: f64, height: f64) {
        let poly = Polygon::custom(vec![
            [0.0, 0.0], [width, 0.0], [width, height], [0.0, height],
        ]).unwrap();
        self.scene.set_boundary(poly);
    }

    /// Set an L-shaped room boundary (origin at 0,0).
    #[wasm_bindgen(js_name = "setLShapeBoundary")]
    pub fn set_l_shape_boundary(&mut self, outer_w: f64, outer_h: f64, cutout_w: f64, cutout_h: f64) {
        self.scene.set_boundary(Polygon::l_shape(outer_w, outer_h, cutout_w, cutout_h));
    }

    /// Set a U-shaped room boundary (origin at 0,0).
    #[wasm_bindgen(js_name = "setUShapeBoundary")]
    pub fn set_u_shape_boundary(&mut self, outer_w: f64, outer_h: f64, channel_w: f64, channel_h: f64) {
        self.scene.set_boundary(Polygon::u_shape(outer_w, outer_h, channel_w, channel_h));
    }

    /// Add a rectangle. Returns the object ID.
    #[wasm_bindgen(js_name = "addRectangle")]
    pub fn add_rectangle(
        &mut self,
        width: f64,
        height: f64,
        x: f64,
        y: f64,
        rotation_deg: f64,
    ) -> Result<u64, JsValue> {
        let poly = Polygon::rectangle(width, height);
        let t = Transform2D::from_degrees(x, y, rotation_deg);
        self.scene.add_shape(poly, t, Default::default()).map_err(placement_err_to_js)
    }

    /// Add an L-shape. Returns the object ID.
    #[wasm_bindgen(js_name = "addLShape")]
    pub fn add_l_shape(
        &mut self,
        outer_w: f64,
        outer_h: f64,
        cutout_w: f64,
        cutout_h: f64,
        x: f64,
        y: f64,
        rotation_deg: f64,
    ) -> Result<u64, JsValue> {
        let poly = Polygon::l_shape(outer_w, outer_h, cutout_w, cutout_h);
        let t = Transform2D::from_degrees(x, y, rotation_deg);
        self.scene.add_shape(poly, t, Default::default()).map_err(placement_err_to_js)
    }

    /// Add a U-shape. Returns the object ID.
    #[wasm_bindgen(js_name = "addUShape")]
    pub fn add_u_shape(
        &mut self,
        outer_w: f64,
        outer_h: f64,
        channel_w: f64,
        channel_h: f64,
        x: f64,
        y: f64,
        rotation_deg: f64,
    ) -> Result<u64, JsValue> {
        let poly = Polygon::u_shape(outer_w, outer_h, channel_w, channel_h);
        let t = Transform2D::from_degrees(x, y, rotation_deg);
        self.scene.add_shape(poly, t, Default::default()).map_err(placement_err_to_js)
    }

    /// Add a custom polygon from [[x,y], ...] vertices. Returns the object ID.
    #[wasm_bindgen(js_name = "addCustomPolygon")]
    pub fn add_custom_polygon(
        &mut self,
        vertices: JsValue,
        x: f64,
        y: f64,
        rotation_deg: f64,
    ) -> Result<u64, JsValue> {
        let verts = js_to_vertices(&vertices)?;
        let poly = Polygon::custom(verts).map_err(|e| JsValue::from_str(&e))?;
        let t = Transform2D::from_degrees(x, y, rotation_deg);
        self.scene.add_shape(poly, t, Default::default()).map_err(placement_err_to_js)
    }

    /// Move/rotate an existing shape. rotation_deg is in degrees.
    #[wasm_bindgen(js_name = "moveShape")]
    pub fn move_shape(&mut self, id: u64, x: f64, y: f64, rotation_deg: f64) -> Result<(), JsValue> {
        let t = Transform2D::from_degrees(x, y, rotation_deg);
        self.scene.move_shape(id, t).map_err(placement_err_to_js)
    }

    /// Remove a shape by ID. Returns true if it existed.
    #[wasm_bindgen(js_name = "removeShape")]
    pub fn remove_shape(&mut self, id: u64) -> bool {
        self.scene.remove_shape(id)
    }

    /// Validate moving an existing shape (excludes self from collision check).
    #[wasm_bindgen(js_name = "validateMove")]
    pub fn validate_move(&self, id: u64, x: f64, y: f64, rotation_deg: f64) -> Result<JsValue, JsValue> {
        let t = Transform2D::from_degrees(x, y, rotation_deg);
        let result = self.scene.validate_move(id, &t);
        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Validate a placement without committing. Returns {valid, collisions, exceedsBoundary}.
    #[wasm_bindgen(js_name = "validatePlacement")]
    pub fn validate_placement(
        &self,
        vertices: JsValue,
        x: f64,
        y: f64,
        rotation_deg: f64,
    ) -> Result<JsValue, JsValue> {
        let verts = js_to_vertices(&vertices)?;
        let poly = Polygon::custom(verts).map_err(|e| JsValue::from_str(&e))?;
        let t = Transform2D::from_degrees(x, y, rotation_deg);
        let result = self.scene.validate_placement(&poly, &t);
        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Get all shapes as array of {id, worldVertices, transform, metadata}.
    #[wasm_bindgen(js_name = "getSceneState")]
    pub fn get_scene_state(&self) -> Result<JsValue, JsValue> {
        let shapes = self.scene.all_shapes();
        serde_wasm_bindgen::to_value(&shapes).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Get world-space vertices of one shape as [[x,y], ...].
    #[wasm_bindgen(js_name = "getShapeVertices")]
    pub fn get_shape_vertices(&self, id: u64) -> Result<JsValue, JsValue> {
        match self.scene.get_shape_info(id) {
            Some(info) => serde_wasm_bindgen::to_value(&info.world_vertices)
                .map_err(|e| JsValue::from_str(&e.to_string())),
            None => Err(JsValue::from_str(&format!("Object {id} not found"))),
        }
    }

    /// Query which shape is at (x, y). Returns id (BigInt) or null.
    #[wasm_bindgen(js_name = "queryPoint")]
    pub fn query_point(&self, x: f64, y: f64) -> JsValue {
        match self.scene.query_point(x, y) {
            Some(id) => JsValue::from(id),
            None => JsValue::NULL,
        }
    }

    /// Export entire scene as a JSON string.
    #[wasm_bindgen(js_name = "exportJson")]
    pub fn export_json(&self) -> String {
        #[derive(Serialize)]
        struct Export {
            boundary: Option<Vec<[f64; 2]>>,
            shapes: Vec<PlacedShapeInfo>,
        }
        let export = Export {
            boundary: self.scene.boundary(),
            shapes: self.scene.all_shapes(),
        };
        serde_json::to_string(&export).unwrap_or_default()
    }

    /// Get boundary vertices as [[x,y], ...], or null if none set.
    #[wasm_bindgen(js_name = "getBoundary")]
    pub fn get_boundary(&self) -> JsValue {
        match self.scene.boundary() {
            Some(verts) => serde_wasm_bindgen::to_value(&verts).unwrap_or(JsValue::NULL),
            None => JsValue::NULL,
        }
    }
}
