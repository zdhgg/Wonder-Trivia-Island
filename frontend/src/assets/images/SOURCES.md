# Image sources

## island-palm.webp and island-lighthouse.webp

- Generated with the built-in ImageGen tool on 2026-10-09. Encoded as WebP at quality 90 with transparent alpha preserved; Lanczos downscaling for the displayed scene sizes.
- Palm: original 1024 × 1536; project asset 512 × 768, 121,462 bytes. Selected output: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-8a502cfd-a0cb-4899-a72d-2ea8b8a2ae1e.png`.
- Lighthouse: original 887 × 1774; project asset 256 × 512, 30,512 bytes. Selected output: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-a0ffb0ca-1613-4423-90c0-406d4b6633e6.png`.
- The sprites replace only the appearance of independently rendered unlocked elements. Original positions, stage thresholds, prosperity details and lighthouse beam animation remain live; original shapes are retained for loading failures.

### Palm generation prompt

Use case: illustration-story. Asset type: isolated transparent game sprite for an existing children's storybook island scene, ONE coconut palm tree, portrait 2:3 composition.
Primary request: a single friendly small coconut palm, complete crown and complete trunk, standing upright with a gently curved slender warm-brown trunk, a readable crown of 6 to 8 broad arching green fronds, exactly two small brown coconuts nestled below the crown.
Style: refined hand-painted children's adventure picture book, soft gouache edges and subtle painterly texture, clean digital finish. Simplified silhouette readable at 35px tall, not photorealistic, not plastic 3D. Match a sunny painted turquoise ocean setting. Leaf colors restrained sage to fresh green, trunk warm ochre brown with delicate ring marks, sunlight from upper right, subtle self-shading.
Composition: centered isolated full tree. Crown is about 85% of canvas width; tree about 90% canvas height. Trunk base near bottom center, tree crown around upper third. Near-front three-quarter view with a tiny view of upper leaf surfaces, suitable for a gently elevated island game view. Keep all leaves inside image, minimal transparent margins.
Constraints: TRUE transparent background outside tree, clean alpha edges. No ground patch, no grass, no sand, no rocks, no sea, no sky, no frame, no scene, no background color, no other trees, no fruit on ground, no characters, no text, no logo, no watermark. No large baked ground shadow. Output only the palm tree.

### Palm alpha cleanup prompt

Use case: background-extraction. Edit the provided palm tree sprite. Preserve the exact tree, its two coconuts, trunk shape, painted leaves, colors, and complete silhouette. Remove ALL the blurry green/yellow/brown backdrop and glow visible between leaves and around the trunk. Output ONLY the opaque tree silhouette on true transparent alpha. Empty space between fronds and either side of the trunk must be completely transparent, not semi-transparent colored haze. Clean alpha edges with only minimal antialiasing. No shadow, no halo, no ground, no sky, no text. Keep original portrait composition and all leaves and trunk fully visible.

### Lighthouse generation prompt

Use case: illustration-story. Asset type: isolated transparent game sprite for an existing children's storybook island scene, ONE lighthouse, tall portrait 1:2 composition.
Primary request: a small welcoming coastal lighthouse: gently tapered off-white masonry tower with two restrained terracotta-red horizontal bands, a warm red conical roof, a narrow lantern room immediately below the roof with a small golden light at its center, two simple blue-teal small windows below it, a small warm brown door at the base, and a narrow stone plinth. A single tower, no attached house.
Style: refined hand-painted children's adventure picture book, soft gouache edges and subtle painterly texture, clean digital finish. Simple silhouette readable at 35px tall, not photorealistic, not plastic 3D. Compatible with a sunny painted turquoise ocean setting and gently elevated island game view. Sunlight from upper right, soft self-shading.
Composition: centered complete building, tower including roof and narrow foundation fills about 90% canvas height, object width around half its height. Near-front three-quarter view, clear base standing at bottom center. Entire roof and base visible, minimal transparent margin. Lantern center should be about 16% down from top of building and centered horizontally.
Constraints: TRUE transparent background outside building, clean alpha edges. No emitted light beam, no sweeping ray, no glow outside silhouette (these are animated separately in app). No ground patch, no grass, no sand, no rocks, no water, no sky, no clouds, no island, no frame, no scene, no background color, no other building, no characters, no text, no logo, no watermark, no giant shadow. Output only the lighthouse.


## island-sea-sky.webp

- Generated with the built-in ImageGen tool on 2026-10-09.
- Used as the shared sky/ocean environment in the knowledge-island hero scene and stage previews. Island terrain, unlocked features, animations, and interactions remain rendered independently.
- Original: 1672 × 941 PNG; encoded as WebP at quality 88 without resizing (106,576 bytes).
- Original generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-3dca289a-f10d-47d2-9baa-2ab88a142689.png`.

### Generation prompt

Use case: illustration-story.
Asset type: ONE reusable background illustration for the existing interactive "My Knowledge Island" scene in a children's learning web app. Generate a landscape 16:9 image, preferably 1536x864.
Primary request: a calm, beautifully painted open ocean and sky backdrop. This is only the environment behind an independently rendered growing island, NOT a complete island scene.
Style/medium: polished hand-painted children's adventure storybook illustration, soft gouache/watercolor edge treatment with clean digital finish, softly simplified shapes compatible with small stylized vector island objects. Gentle atmospheric depth, light brush texture, cohesive with a sunny tropical storybook homepage, but much quieter and less detailed.
Composition: fixed horizon at 40% of image height. Upper 40% is a pale airy cyan-blue sky, softly fading toward the horizon. Wispy distant cloud banks mostly close to the horizon and along the outer edges, with plenty of open sky. Lower 60% is calm turquoise sea, pale hazy teal near the horizon gradually deepening to restrained medium blue-teal in the foreground. A few broad, delicate horizontal ripples and subtle glints at outer edges. Center and lower-center (x 10%-90%, y 43%-88%) must remain visually quiet open water, allowing six different sizes of a separate small sandy island to be composited there. Light from upper right, but do NOT draw a sun.
Mood/palette: welcoming, peaceful, airy daylight, low-to-medium contrast; powder blue, muted turquoise, soft ivory-white cloud accents. Avoid vivid saturation or photorealism.
Constraints: environment only; no foreground island, no beach, no plants, no palm leaves, no buildings, no lighthouse, no boats, no characters, no birds, no bottles, no sun, no text, no border, no UI, no logos, no watermark. Do not draw objects suggesting unlocked growth stages. No large wave crests, no dramatic clouds, no sharp perspective lines. Keep the full scene usable at small mobile size as well as desktop.


## Additional island element sprites

Generated with the built-in ImageGen tool on 2026-10-09. Converted to transparent WebP at quality 90; Lanczos downscaling only. Original zone sizes, stage thresholds, prosperity additions, reduced-motion preferences and interactive responses are retained. Original code shapes remain as loading/error fallbacks.

### island-tent.webp

- Original: 1448 × 1086; project asset: 512 × 384, 39,038 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-dc373f2c-e719-4b37-b1c0-68c2b1583d66.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE small orange-ochre canvas A-frame camping tent, visible triangular front with a dark open doorway, a simple brown support pole and a softly shaded side panel. Landscape 4:3 composition. No flag, boxes, fire, smoke, plants, ropes spreading outward, surrounding campsite or ground; only the tent.

### island-dock.webp

- Original: 2172 × 724; project asset: 512 × 171, 30,586 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-91928f5b-4a94-4ced-a7bf-e8607f8fe6a2.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE small weathered honey-brown wooden landing jetty/platform with plank grain, four simple short wooden support posts below its deck. Wide landscape 3:1 composition, viewed slightly from above. The long deck runs horizontally left to right, near side and posts visible. No boats, stairs, railings, flags, nets, lanterns, rope, water, shore or vegetation. Only a compact elevated wooden deck, not an entire harbor.

### island-boat.webp

- Original: 1254 × 1254; project asset: 512 × 512, 48,306 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-380c18b9-75b6-4fff-86c3-00573517ac57.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE small friendly single-mast sailboat with a warm orange/brown wooden hull and a single ivory triangular sail. Near-front three-quarter side view with bow pointing right, tall mast centered, hull at bottom. Near square portrait composition. No flags, people, anchor, rope extending out, cargo, surrounding water or wake. Only hull, mast and sail.

### island-observatory.webp

- Original: 1254 × 1254; project asset: 512 × 512, 53,976 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-d72e8b65-4299-456d-8a42-23f5cc83d0f3.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE small brass/copper astronomical telescope aimed diagonally up toward the left on a sturdy three-legged warm-brown wooden tripod, standing on a very small round timber platform just wider than its feet. Near square composition. Complete telescope and all three legs visible. No observatory building, roof, dome, flag, person, sky, stars, beam, ground patch or other props. Only telescope, tripod, small platform.

### island-rock.webp

- Original: 1448 × 1086; project asset: 256 × 192, 12,506 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-34c52099-0835-4458-abfa-95c473efdd3c.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE rounded low gray-blue coastal rock, landscape 4:3 composition. Smooth readable silhouette, two or three softly painted stone facets, gentle warm sunlit upper face and restrained cool shadow on lower face. No moss, plants, cracks with high contrast, surrounding sand, water, shadow outside silhouette or extra rocks.

### island-shell.webp

- Original: 1254 × 1254; project asset: 256 × 256, 23,064 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-597a224c-d8db-4cbf-9784-cfb3f842a264.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE peach-ivory scallop seashell, near square composition. Fan-shaped shell with rounded scalloped upper rim, small hinge at bottom and a few clear delicate radiating ribs. Gentle coral/apricot shading, readable at 15px. No pearl, plant, sand, sea, shadow outside silhouette or extra shells.

### island-driftwood.webp

- Original: 2172 × 724; project asset: 256 × 85, 9,154 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-b40582ed-c7dc-49eb-9b83-9e4a64050f94.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE short weathered light warm-brown piece of beach driftwood with a small side branch stub and subtle wood grain. Landscape 3:1 composition, log angled slightly upward toward the right; softly rounded ends. No plants, moss, sand, sea, fire, other logs or shadow outside object.

### island-sprout.webp

- Original: 1086 × 1448; project asset: 192 × 256, 11,358 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-5f19c3cc-2bd6-4063-8ed1-d335699dc0a6.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE tiny upright young green seedling with a slender short curved green stem and exactly TWO broad fresh-green oval leaves opening left and right near its top. Portrait 3:4 composition. Roots not visible. No pot, flowers, buds, extra leaves, soil, sand, grass, tree trunk, ground patch or shadow outside plant.

### island-grass.webp

- Original: 1312 × 1199; project asset: 256 × 234, 18,158 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-fda8d503-8119-4734-9a92-bff8fbfb87d3.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE small low tuft of 5-7 curved fresh-green grass blades, compact near square composition. Blades gather at bottom center, taper cleanly, gently spread left and right. Simple readable leaves with soft darker green inner shading. No flowers, buds, soil, rocks, ground patch, pot or any surrounding vegetation.

### island-starfish.webp

- Original: 1254 × 1254; project asset: 256 × 256, 21,358 bytes.
- Selected generated file: `C:/Users/ZhuanZ/.codex/generated_images/01a11e97-3d6c-76d1-99c3-f3b127c23d11/exec-eeb9f256-66d1-4f3a-8a11-2064b2f751fb.png`.

Full generation prompt:

Use case: illustration-story. Asset type: ONE isolated transparent sprite for an existing children's storybook island game. Style: cohesive refined hand-painted gouache adventure picture book with clean alpha, soft painterly edges and modest texture, warm sunny light from upper right. Match painted coconut palm and ivory/terracotta lighthouse. Gentle elevated three-quarter game view, readable simplified silhouette at 20-60 screen pixels. True transparent background, empty space fully transparent; NO scene, ground patch, sea, sky, island, plants unless subject is a plant, text, logos, watermark, characters, border, glow or cast shadow beyond object. Fill about 85-90% of canvas with complete unclipped object, little transparent margin.
Subject: ONE small friendly orange-apricot starfish with five gently rounded arms and subtle painted highlights, near square composition, viewed from slightly above. Natural soft silhouette, sparse surface texture readable at 10px. No face, eyes, cartoon expression, sand, shells, water, ground patch or shadow outside object.
