// Vendored DXF geometry helpers.
//
// These are faithful TypeScript ports of two modules from the `dxf` package
// (BSD-licensed, https://github.com/bjnortier/dxf) that are NOT part of its
// public API: `lib/entityToPolyline` and `lib/applyTransforms`. We previously
// deep-imported them from `dxf/lib/*` behind an ambient type shim, which a
// future `dxf` major could break silently. Vendoring keeps the import feature
// fully typed and independent of the package's internal layout while we still
// consume its public `parseString`/`denormalise` exports in `plannerDxf.ts`.
//
// The B-spline evaluator is itself ported (via `dxf`) from the unmaintained
// `b-spline` library © 2015 Thibaut Séguy. The bulge-arc helper is ported from
// `dxf`'s `createArcForLWPolyline`, with the small 2-vector math inlined so we
// don't pull in the external `vecks` dependency.

export type Point = [number, number]

// The transform bag `denormalise` attaches to each entity (translation, scale,
// rotation in degrees, extrusion flip). Fields are optional/partial per entity.
export type DxfTransform = {
  x?: number
  y?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  extrusionZ?: number
}

// Just the fields the geometry functions below read off a parsed entity. The
// importer's own `RawEntity` extends this, so values flow through untouched.
export type DxfEntity = {
  type: string
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  vertices?: Array<{ x: number; y: number; bulge?: number }>
  closed?: boolean
  polyfaceMesh?: boolean
  polygonMesh?: boolean
  x?: number
  y?: number
  r?: number
  majorX?: number
  majorY?: number
  axisRatio?: number
  startAngle?: number
  endAngle?: number
  extrusionZ?: number
  controlPoints?: Array<{ x: number; y: number }>
  degree?: number
  knots?: Array<number>
  weights?: Array<number>
  transforms?: Array<DxfTransform>
}

// Decimal rounding by power of ten (round10(x, -9) ≈ round to 9 places). Ported
// from `dxf`'s util/round10 (MDN-derived, public domain).
const round10 = (value: number, exp: number): number => {
  if (exp === 0) return Math.round(value)
  const v = value.toString().split("e")
  const shifted = Math.round(
    Number(`${v[0]}e${v[1] ? Number(v[1]) - exp : -exp}`)
  )
  const v2 = shifted.toString().split("e")
  return Number(`${v2[0]}e${v2[1] ? Number(v2[1]) + exp : exp}`)
}

// De Boor's algorithm: evaluate a B-spline at parameter t ∈ [0, 1].
const bSpline = (
  t: number,
  degree: number,
  points: Array<Point>,
  knots: Array<number>,
  weights?: Array<number>
): Array<number> => {
  const n = points.length // points count
  const d = points[0].length // point dimensionality

  if (t < 0 || t > 1) throw new Error(`t out of bounds [0,1]: ${t}`)
  if (degree < 1) throw new Error("degree must be at least 1 (linear)")
  if (degree > n - 1) {
    throw new Error("degree must be less than or equal to point count - 1")
  }

  const w = weights ?? Array.from({ length: n }, () => 1)
  if (knots.length !== n + degree + 1) throw new Error("bad knot vector length")

  const domain = [degree, knots.length - 1 - degree]

  // Remap t to the domain where the spline is defined.
  const low = knots[domain[0]]
  const high = knots[domain[1]]
  // Clamp instead of throwing — see bjnortier/dxf#28.
  let u = t * (high - low) + low
  u = Math.max(u, low)
  u = Math.min(u, high)

  // Find the spline segment s for the parameter value.
  let s = domain[0]
  for (; s < domain[1]; s++) {
    if (u >= knots[s] && u <= knots[s + 1]) break
  }

  // Convert points to homogeneous coordinates.
  const v: Array<Array<number>> = []
  for (let i = 0; i < n; i++) {
    v[i] = []
    for (let j = 0; j < d; j++) v[i][j] = points[i][j] * w[i]
    v[i][d] = w[i]
  }

  // Build the de Boor pyramid.
  for (let l = 1; l <= degree + 1; l++) {
    for (let i = s; i > s - degree - 1 + l; i--) {
      const alpha = (u - knots[i]) / (knots[i + degree + 1 - l] - knots[i])
      for (let j = 0; j < d + 1; j++) {
        v[i][j] = (1 - alpha) * v[i - 1][j] + alpha * v[i][j]
      }
    }
  }

  // Convert back to cartesian.
  const result: Array<number> = []
  for (let i = 0; i < d; i++) result[i] = round10(v[s][i] / v[s][d], -9)
  return result
}

// Sample a (closed or open) B-spline into a polyline. Examines the knot vector
// to create per-segment interpolation steps.
const interpolateBSpline = (
  controlPoints: Array<{ x: number; y: number }>,
  degree: number,
  knots: Array<number>,
  interpolationsPerSplineSegment: number | undefined,
  weights?: Array<number>
): Array<Point> => {
  const polyline: Array<Point> = []
  const controlPointsForLib: Array<Point> = controlPoints.map((p) => [p.x, p.y])
  const segmentTs = [knots[degree]]
  const domain = [knots[degree], knots[knots.length - 1 - degree]]
  for (let k = degree + 1; k < knots.length - degree; ++k) {
    if (segmentTs[segmentTs.length - 1] !== knots[k]) segmentTs.push(knots[k])
  }
  const steps = interpolationsPerSplineSegment || 25
  for (let i = 1; i < segmentTs.length; ++i) {
    const uMin = segmentTs[i - 1]
    const uMax = segmentTs[i]
    for (let k = 0; k <= steps; ++k) {
      const u = (k / steps) * (uMax - uMin) + uMin
      let t = (u - domain[0]) / (domain[1] - domain[0])
      t = Math.max(t, 0)
      t = Math.min(t, 1)
      const p = bSpline(t, degree, controlPointsForLib, knots, weights)
      polyline.push([p[0], p[1]])
    }
  }
  return polyline
}

const rotate = (points: Array<Point>, angle: number): Array<Point> =>
  points.map((p) => [
    p[0] * Math.cos(angle) - p[1] * Math.sin(angle),
    p[1] * Math.cos(angle) + p[0] * Math.sin(angle),
  ])

// Sample an ellipse arc (or full ellipse) into points, 72 segments per turn.
const interpolateEllipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start: number,
  end: number,
  rotationAngle?: number
): Array<Point> => {
  let e = end
  if (e < start) e += Math.PI * 2

  let points: Array<Point> = []
  const dTheta = (Math.PI * 2) / 72
  const EPS = 1e-6
  for (let theta = start; theta < e - EPS; theta += dTheta) {
    points.push([Math.cos(theta) * rx, Math.sin(theta) * ry])
  }
  points.push([Math.cos(e) * rx, Math.sin(e) * ry])

  if (rotationAngle) points = rotate(points, rotationAngle)
  return points.map((p) => [cx + p[0], cy + p[1]])
}

// Expand a single LWPOLYLINE bulge segment into the intermediate arc points
// (start and end excluded). Ported from `dxf`'s createArcForLWPolyline with the
// vecks V2 math inlined. `resolution` is in degrees.
const createArcForLWPolyline = (
  from: Point,
  to: Point,
  bulge: number,
  resolution = 5
): Array<Point> => {
  // bulge = tan(theta / 4); a negative bulge means a clockwise arc, handled by
  // swapping endpoints and negating.
  let theta: number
  let a: Point
  let b: Point
  if (bulge < 0) {
    theta = Math.atan(-bulge) * 4
    a = [from[0], from[1]]
    b = [to[0], to[1]]
  } else {
    theta = Math.atan(bulge) * 4
    a = [to[0], to[1]]
    b = [from[0], from[1]]
  }

  const ab: Point = [b[0] - a[0], b[1] - a[1]]
  const lengthAB = Math.hypot(ab[0], ab[1])
  const c: Point = [a[0] + ab[0] * 0.5, a[1] + ab[1] * 0.5]

  // Distance from the arc center to the chord midpoint.
  const lengthCD = Math.abs(lengthAB / 2 / Math.tan(theta / 2))
  const normAB: Point = [ab[0] / lengthAB, ab[1] / lengthAB]
  // normAB rotated by +90°.
  const perp: Point = [
    normAB[0] * Math.cos(Math.PI / 2) - normAB[1] * Math.sin(Math.PI / 2),
    normAB[1] * Math.cos(Math.PI / 2) + normAB[0] * Math.sin(Math.PI / 2),
  ]
  // d is the center of the arc; the sign of the offset flips for theta ≥ π.
  const sign = theta < Math.PI ? -lengthCD : lengthCD
  const d: Point = [c[0] + perp[0] * sign, c[1] + perp[1] * sign]

  const startAngle = (Math.atan2(b[1] - d[1], b[0] - d[0]) / Math.PI) * 180
  let endAngle = (Math.atan2(a[1] - d[1], a[0] - d[0]) / Math.PI) * 180
  if (endAngle < startAngle) endAngle += 360
  const r = Math.hypot(b[0] - d[0], b[1] - d[1])

  const startInter =
    Math.floor(startAngle / resolution) * resolution + resolution
  const endInter = Math.ceil(endAngle / resolution) * resolution - resolution
  const points: Array<Point> = []
  for (let i = startInter; i <= endInter; i += resolution) {
    points.push([
      d[0] + Math.cos((i / 180) * Math.PI) * r,
      d[1] + Math.sin((i / 180) * Math.PI) * r,
    ])
  }
  // Maintain ordering so the points join the from/to endpoints correctly.
  if (bulge < 0) points.reverse()
  return points
}

/**
 * Convert a parsed DXF entity to a polyline in its local coordinate space.
 * Tessellates curves (CIRCLE/ELLIPSE/ARC/SPLINE) and expands LWPOLYLINE bulge
 * arcs; straight segments pass through. Returns `[]` for entity types it can't
 * render. Ported from `dxf`'s `entityToPolyline`.
 */
export const entityToPolyline = (
  entity: DxfEntity,
  options: { interpolationsPerSplineSegment?: number } = {}
): Array<Point> => {
  let polyline: Array<Point> | undefined

  if (entity.type === "LINE") {
    polyline = [
      [entity.start?.x ?? 0, entity.start?.y ?? 0],
      [entity.end?.x ?? 0, entity.end?.y ?? 0],
    ]
  }

  if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
    polyline = []
    if (entity.polyfaceMesh || entity.polygonMesh) {
      // Mesh polylines aren't used by planner shapes; leave empty.
    } else if (entity.vertices && entity.vertices.length) {
      const verts = entity.closed
        ? entity.vertices.concat(entity.vertices[0])
        : entity.vertices
      for (let i = 0, il = verts.length; i < il - 1; ++i) {
        const from: Point = [verts[i].x, verts[i].y]
        const to: Point = [verts[i + 1].x, verts[i + 1].y]
        polyline.push(from)
        if (verts[i].bulge) {
          polyline = polyline.concat(
            createArcForLWPolyline(from, to, verts[i].bulge as number)
          )
        }
        if (i === il - 2) polyline.push(to)
      }
    }
  }

  if (entity.type === "CIRCLE") {
    polyline = interpolateEllipse(
      entity.x ?? 0,
      entity.y ?? 0,
      entity.r ?? 0,
      entity.r ?? 0,
      0,
      Math.PI * 2
    )
    if (entity.extrusionZ === -1) polyline = polyline.map((p) => [-p[0], p[1]])
  }

  if (entity.type === "ELLIPSE") {
    const majorX = entity.majorX ?? 0
    const majorY = entity.majorY ?? 0
    const rx = Math.sqrt(majorX * majorX + majorY * majorY)
    const ry = (entity.axisRatio ?? 1) * rx
    const majorAxisRotation = -Math.atan2(-majorY, majorX)
    polyline = interpolateEllipse(
      entity.x ?? 0,
      entity.y ?? 0,
      rx,
      ry,
      entity.startAngle ?? 0,
      entity.endAngle ?? Math.PI * 2,
      majorAxisRotation
    )
    if (entity.extrusionZ === -1) polyline = polyline.map((p) => [-p[0], p[1]])
  }

  if (entity.type === "ARC") {
    polyline = interpolateEllipse(
      entity.x ?? 0,
      entity.y ?? 0,
      entity.r ?? 0,
      entity.r ?? 0,
      entity.startAngle ?? 0,
      entity.endAngle ?? 0
    )
    if (entity.extrusionZ === -1) polyline = polyline.map((p) => [-p[0], p[1]])
  }

  if (entity.type === "SPLINE") {
    if (entity.controlPoints && entity.knots && entity.degree != null) {
      polyline = interpolateBSpline(
        entity.controlPoints,
        entity.degree,
        entity.knots,
        options.interpolationsPerSplineSegment,
        entity.weights
      )
    }
  }

  return polyline ?? []
}

/**
 * Bake a transform stack (translation/scale/rotation/extrusion flip) into a
 * polyline, returning world-space points. Ported from `dxf`'s `applyTransforms`
 * — the order is scale → rotate → translate → extrusion-Z flip.
 */
export const applyTransforms = (
  polyline: Array<Point>,
  transforms: ReadonlyArray<DxfTransform>
): Array<Point> => {
  let result = polyline
  for (const transform of transforms) {
    result = result.map((p) => {
      let p2: Point = [p[0], p[1]]
      if (transform.scaleX) p2[0] = p2[0] * transform.scaleX
      if (transform.scaleY) p2[1] = p2[1] * transform.scaleY
      if (transform.rotation) {
        const angle = (transform.rotation / 180) * Math.PI
        p2 = [
          p2[0] * Math.cos(angle) - p2[1] * Math.sin(angle),
          p2[1] * Math.cos(angle) + p2[0] * Math.sin(angle),
        ]
      }
      if (transform.x) p2[0] = p2[0] + transform.x
      if (transform.y) p2[1] = p2[1] + transform.y
      // Some CAD apps use a negative extrusion Z to flip on X.
      if (transform.extrusionZ === -1) p2[0] = -p2[0]
      return p2
    })
  }
  return result
}
