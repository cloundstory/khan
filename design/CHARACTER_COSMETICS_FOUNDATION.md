# Character cosmetics foundation

The room currently has one approved character bundle, `reader-01`. There is
therefore no character picker in Settings: showing a one-option choice would
take space without giving the reader a decision to make. The existing cat
picker remains the only visible cosmetic control.

## The contract

`src/scene/characterManifest.ts` is the single source of truth. A character
bundle is one atomic illustrated person with an approved visual wardrobe,
rather than a base body with clothes layered over it in the browser. It must
contain at least one transparent, room-aligned asset for both required poses:

| Pose | When the room uses it |
| --- | --- |
| `reading` | A book is on the desk or a reading session is active |
| `window` | The room is otherwise at rest |

Keeping the entire outfit in each pose protects the hand-drawn linework,
lighting, and perspective. It also means a user never sees a shirt, hands, or
shadow that belongs to a different figure.

### Identity rule

One selectable `characterId` means one person. Every `reading` and `window`
asset in that bundle must portray that same approved face, hair, glasses,
colour family, and illustration treatment. A pose may carry deliberate
contextual details such as indoor socks while reading and shoes while standing,
but it must never turn into a different person. A new outfit choice or a new
person becomes selectable only after its *complete* pair of matching poses is
reviewed. At runtime, `selectScenePose()` can resolve a pose only from the
selected character's own bundle; each pose repeats its `characterId`, and the
manifest test rejects a mixed bundle before it ships.

### Art direction gate

Character art is illustration, not a realistic rendered overlay. Preserve
visible ink contour, uneven pencil-like hatching, paper grain, restrained
earthy colour, and small handmade asymmetries. Do not smooth it into vector
art, glossy 3D, photographic skin, or a mechanically symmetric pose. When a
source is approved with a checkerboard preview, remove only that preview
background; do not redraw the person or replace its marks with generated
detail.

`SceneCharacterId` is inferred from the keys in `SCENE_CHARACTERS`. The saved
value in `Settings.scene.characterId` is normalized against that manifest when
the app starts, so a removed or stale bundle safely returns to the default.
No Dexie migration is required when a new approved bundle is added because the
field is not indexed.

## Adding a real future choice

1. Create and visually approve **both** pose assets for one person/outfit in
   `public/scene/characters/`. Preserve alpha and keep their frames in the
   941 × 1672 room artboard coordinate system.
2. Add one entry to `SCENE_CHARACTERS` with a stable id, Thai display label,
   and non-empty `reading` and `window` arrays. The TypeScript manifest type
   rejects an empty pose list.
3. Set each artboard frame after checking the actual mobile crop. Do not
   reuse a frame just because another character uses it.
4. Run TypeScript and a visual check on morning, day, and night room plates.
   Test the reading state with a desk book and the window state with no desk
   book.

When the manifest contains more than one complete bundle, Settings reveals its
character picker automatically. It uses the approved reading art for its
preview and saves only the stable bundle id. No UI or data migration changes
are needed at that time.

## Boundaries and follow-up checks

- A bundle is deliberately not a mix-and-match clothing system. If later work
  truly needs separate tops, hair, and accessories, create a separate
  compositing specification first; it needs matching anchors for every pose
  and must be visually tested against the illustrated room.
- The manifest guarantees a non-empty pose list at compile time, but it cannot
  verify that a public image file exists or that its alpha/frame is correct.
  Asset review remains the gate before adding an entry.
- `saveSceneCosmetics` now merges patches inside a Dexie transaction. Choosing
  a cat and a character in quick succession cannot restore an older value from
  the screen's state snapshot.
