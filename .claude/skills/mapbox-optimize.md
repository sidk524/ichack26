# Mapbox GL JS Performance Optimization Skill

Analyze and optimize Mapbox GL JS implementations for maximum performance.

## What This Skill Does

Audits your Mapbox implementation and provides actionable optimizations based on official Mapbox performance guidelines. Focuses on reducing render time by minimizing layers, sources, and geometric complexity.

## When to Use

- `/mapbox-optimize` - Run full performance audit
- `/mapbox-optimize layers` - Focus on layer optimization
- `/mapbox-optimize sources` - Focus on source optimization
- `/mapbox-optimize expressions` - Focus on expression/filter optimization

## Performance Model

Mapbox GL JS performance follows this equation:

```
Render Time = constant + (sources × per-source) + (layers × per-layer) + (vertices × per-vertex)
```

Optimization targets: **minimize sources, minimize layers, minimize vertices**

---

## Instructions for Claude

When this skill is invoked, perform the following analysis on the codebase:

### 1. **Locate Mapbox Files**

Search for files containing Mapbox GL JS usage:
- Look for `mapboxgl.Map`, `new mapboxgl.Map(`, `mapbox-gl` imports
- Check React components using map hooks
- Find style configurations and layer definitions
- Locate GeoJSON data sources

### 2. **Layer Analysis**

**Check for:**
- Total layer count (flag if > 50 layers)
- Duplicate layers with similar styles (candidates for data-driven styling)
- Layers that can be grouped by matching: `type`, `source`, `source-layer`, `minzoom`, `maxzoom`, `filter`, `layout`
- Missing `minzoom`/`maxzoom` constraints
- Layers without proper filtering

**Recommendations:**
```javascript
// BAD: Multiple similar layers
map.addLayer({ id: 'red-points', type: 'circle', paint: { 'circle-color': 'red' }});
map.addLayer({ id: 'blue-points', type: 'circle', paint: { 'circle-color': 'blue' }});

// GOOD: Single layer with data-driven styling
map.addLayer({
  id: 'points',
  type: 'circle',
  paint: {
    'circle-color': ['match', ['get', 'category'],
      'type-a', 'red',
      'type-b', 'blue',
      'gray' // fallback
    ]
  }
});
```

### 3. **Source Analysis**

**Check for:**
- Multiple GeoJSON sources that could be combined
- Large GeoJSON files (> 5MB) that should be vector tilesets
- Unused sources
- Missing composited source opportunities

**Recommendations:**
```javascript
// BAD: Large GeoJSON for static data
map.addSource('incidents', {
  type: 'geojson',
  data: '/api/all-incidents' // 50,000 features
});

// GOOD: Vector tileset for large datasets
map.addSource('incidents', {
  type: 'vector',
  url: 'mapbox://username.incidents-tileset'
});

// BEST: Separate static and dynamic data
map.addSource('incidents-static', { type: 'vector', url: '...' });
map.addSource('incidents-dynamic', { type: 'geojson', data: {...} }); // small
```

### 4. **Expression Optimization**

**Check for:**
- Filters without zoom constraints
- Missing property existence checks (`has`)
- Unordered filters (should be most-specific-first)
- Complex `match` expressions that could be simplified
- Filters not checking common properties first

**Recommendations:**
```javascript
// BAD: No zoom constraints
{ "filter": ["==", ["get", "class"], "state"] }

// GOOD: Add zoom constraints
{
  "minzoom": 3,
  "maxzoom": 9,
  "filter": ["==", ["get", "class"], "state"]
}

// BAD: No existence check
{ "filter": ["<=", ["get", "reflen"], 6] }

// GOOD: Check existence first
{ "filter": ["all", ["has", "reflen"], ["<=", ["get", "reflen"], 6]] }

// BAD: Complex match for simple equality
{ "filter": ["match", ["get", "foo"], "bar", true, false] }

// GOOD: Use equality operator
{ "filter": ["==", ["get", "foo"], "bar"] }
```

### 5. **Style URL Optimization**

**Check for:**
- Missing `?optimize=true` parameter on style URLs
- Warn if user adds runtime layers that depend on source layers not in initial style

**Recommendations:**
```javascript
// GOOD: Use optimized styles for production
const map = new mapboxgl.Map({
  style: 'mapbox://styles/mapbox/streets-v12?optimize=true'
});

// WARNING: Don't use optimize=true if adding runtime layers
// that need source layers not in the initial style
```

### 6. **Feature State Usage**

**Check for:**
- Frequent `setData()` calls on GeoJSON sources
- Hover/click interactions updating entire source
- Missing `feature-state` usage for dynamic properties

**Recommendations:**
```javascript
// BAD: Re-parse entire GeoJSON on hover
map.getSource('incidents').setData(updatedGeoJSON);

// GOOD: Use feature state
map.setFeatureState(
  { source: 'incidents', id: incidentId },
  { hover: true }
);

// Layer paint property
'fill-color': [
  'case',
  ['boolean', ['feature-state', 'hover'], false],
  '#ff0000',
  '#0000ff'
]
```

### 7. **Vector Tileset Recommendations**

**Check for:**
- GeoJSON sources with > 1000 features
- Static data loaded via `setData()`
- Missing opportunities for Mapbox Tiling Service

**Recommendations:**
- Convert large GeoJSON to vector tilesets using Tippecanoe or Mapbox Studio
- Use vector tiles for data that doesn't update frequently
- Keep small, frequently-updated data as GeoJSON

### 8. **Three.js / 3D Model Integration**

**Check for:**
- Custom layers with Three.js rendering
- Multiple 3D model instances (e.g., ambulance markers)
- Missing instancing or level-of-detail (LOD) optimization

**Recommendations:**
```javascript
// BAD: Creating new geometry for each vehicle
vehicles.forEach(v => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});

// GOOD: Use instancing for repeated models
const geometry = new THREE.BoxGeometry(1, 1, 1);
const instancedMesh = new THREE.InstancedMesh(geometry, material, vehicleCount);
vehicles.forEach((v, i) => {
  const matrix = new THREE.Matrix4();
  matrix.setPosition(v.x, v.y, v.z);
  instancedMesh.setMatrixAt(i, matrix);
});
scene.add(instancedMesh);
```

---

## Output Format

Provide optimization report with this structure:

### 📊 Performance Audit Summary

**Current State:**
- ✅ / ⚠️ / ❌ Layer count: X layers
- ✅ / ⚠️ / ❌ Source count: X sources
- ✅ / ⚠️ / ❌ Vector tileset usage
- ✅ / ⚠️ / ❌ Expression optimization
- ✅ / ⚠️ / ❌ Feature state usage

### 🔧 High-Impact Optimizations

1. **[Category]** - Estimated impact: High/Medium/Low
   - Current: [what's currently happening]
   - Recommendation: [specific code change]
   - File: `path/to/file.tsx:123`

### 📝 Quick Wins

List of simple changes with immediate performance benefits.

### 🚀 Long-Term Improvements

Architectural changes for sustained performance.

---

## Example Usage

**User runs:** `/mapbox-optimize`

**Claude responds with:**

```
📊 Mapbox Performance Audit

Current State:
❌ Layer count: 87 layers (target: < 50)
⚠️ Source count: 15 sources (some can be combined)
❌ Large GeoJSON: incidents.geojson (12MB, 50k features)
✅ Expression optimization: Filters look good
❌ Feature state: Not using feature-state for hover effects

🔧 High-Impact Optimizations

1. Convert GeoJSON to Vector Tileset - Impact: HIGH
   - Current: Loading 50k incident features as GeoJSON (12MB)
   - Recommendation: Create vector tileset with Tippecanoe
   - File: user_interface/components/MapView.tsx:45

   ```bash
   tippecanoe -o incidents.mbtiles -z 14 incidents.geojson
   # Upload to Mapbox Studio
   ```

2. Combine Similar Layers - Impact: HIGH
   - Current: 25 separate point layers for different incident types
   - Recommendation: Use single layer with data-driven styling
   - File: user_interface/components/MapLayers.tsx:120-450

   [Show code diff...]

3. Use Feature State for Hover - Impact: MEDIUM
   - Current: Calling setData() on every mousemove (300ms update time)
   - Recommendation: Use map.setFeatureState() instead
   - File: user_interface/components/MapInteractions.tsx:78

   [Show code diff...]

📝 Quick Wins:
- Add ?optimize=true to style URL (saves 20% render time)
- Add minzoom/maxzoom to detail layers (saves 15% at far zoom levels)
- Check property existence in filters (prevents errors, slight perf gain)

🚀 Long-Term:
- Set up Mapbox Tiling Service for automatic tileset updates
- Implement Three.js instancing for 3D vehicle models (current: 50 ambulances = 50 meshes)
- Create tileset with multiple source layers to reduce source count
```

---

## Key Resources

- **Mapbox Performance Guide**: https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/
- **Tippecanoe**: https://github.com/felt/tippecanoe
- **Mapbox Tiling Service**: https://docs.mapbox.com/mapbox-tiling-service/
- **Feature State API**: https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setfeaturestate

---

## Notes

- Always test performance changes with Chrome DevTools Performance profiler
- Focus on bottlenecks specific to your map (layers vs sources vs vertices)
- Vector tilesets are best for large, static data
- GeoJSON is best for small, frequently-updated data
- Data-driven styling is your best friend for reducing layer count
