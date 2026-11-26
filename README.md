# Puzzle Games React Native App

This is a collection of puzzle games built with React Native, including a Monument Valley-inspired path puzzle.

## Look and feel

A bright, kid-friendly style: the rounded Fredoka font, candy colours, chunky 3D buttons and big rounded cards. Colours, font names and corner sizes live in `src/theme.ts`; the shared button is `src/components/ChunkyButton.tsx`, and `src/components/AppText.tsx` applies the font to all text.

Sound effects and light buzzes play in every game (`src/lib/sound.ts`); the 🔊/🔇 button on the home screen turns both off and remembers the choice. Every win card springs in, pops its stars in one by one and drops confetti (`src/components/Confetti.tsx`). The phone's back button goes from a puzzle to its list or map, then home (`src/lib/useBackHandler.ts`).

## Players, Log in and Leaderboard

- **Who's playing?** Several kids can share one phone. On first launch, and after logging out, the app shows every player on the phone: tap your buddy to log in, tap **＋ New player** to add one, or tap **Sign in with Google**. Each player has their own stars, levels and trophies.
- **Log out:** the 🚪 button on the home screen, or **🚪 Log out** on the profile screen. Progress stays saved for next time. The profile screen also has **🗑️ Remove this player**, which deletes that player's progress and scores from the phone (it asks first).
- **Sign in with Google:** a Google player logs in by picking their Google account again, so nobody else can play as them. The Google name fills in the gamer name, which can still be changed. The app only asks Google for the name and email; everything is still saved on this phone only. This needs an installed build of the app (not Expo Go) and a one-time setup in Google Cloud: see [Setting up Google sign-in](#setting-up-google-sign-in).
- **Profile:** a gamer name (type one or tap 🎲 for a random one) and an animal avatar. Tap your name on the home screen to change them. Names are unique on the phone. The profile screen also shows your trophies: wins and best result in each game.
- **Leaderboard:** the 🏆 button on the home screen. The **Top 10** tab ranks the best plays of each game (Monument Valley: furthest level; Sliding Puzzle: hardest level, then fewest moves; Number Match: fewest moves; Word Search, Sudoku and Jigsaw: hardest level, then fastest time; Fruit Pop: furthest level, then highest score; Flower Pipes and Light Switch: furthest level, then fewest taps; Maze Run: furthest maze, then fewest steps; Color Flood: furthest level, then fewest moves; Picture Cross: most pictures, then fewest mistakes). The **History** tab lists the last 200 games played, newest first.
- Every finished game is saved with the name and avatar used at the time, like an arcade machine. The leaderboard is shared by all players on the phone. The win popup says when you made the top 10 or beat your personal best.
- Everything is stored on the device (AsyncStorage). There is no online leaderboard.

## Games Included

Every screen of every game (puzzle lists, level maps and the play screens) has a **❓ How to play** button that opens a short animated tutorial (a pointing hand plays a few moves, with captions, ⏸/▶ and ↺ replay), followed by the goal, the steps and how stars work. It also opens by itself the first time you play each game. The guides are in `src/lib/howToPlay.ts`.

1. **Sliding Puzzle** - Slide tiles back into order: numbers or pictures (5 levels × 30 puzzles)
2. **Word Search** - Find hidden words in a grid of letters (5 levels × 30 themed puzzles)
3. **Number Match** - Flip cards to find matching pairs of numbers
4. **Monument Valley** - Turn path tiles to connect Amit to the goal, then walk Amit there
5. **Sudoku** - Fill every row, column and box with each number once (5 levels × 50 puzzles)
6. **Jigsaw** - Drag real jigsaw-shaped pieces into place to build a picture (5 levels × 24 puzzles)
7. **Fruit Pop** - Swap fruits to match 3 or more, with goals and a move limit (60 levels on a map)
8. **Flower Pipes** - Turn pipe tiles so water reaches every flower (60 levels on a map)
9. **Maze Run** - Drag a little animal through a maze to its treat (60 mazes on a map)
10. **Light Switch** - Tap lamps (each tap also switches its neighbours) until every lamp is on (60 levels on a map)
11. **Color Flood** - Spread paint from the corner until the board is one colour, within a move limit (60 levels on a map)
12. **Picture Cross** - Use number clues to colour squares and reveal a hidden pixel picture (30 pictures on a map)

## Sliding Puzzle

Five levels, each with **30 numbered puzzles** (150 in all), in the same puzzle list as the other games:

| Level | Board | Shuffle |
|---|---|---|
| 1 🐣 Tiny | 3×3 | light (14 slides) |
| 2 🐥 Easy | 3×3 | full |
| 3 🦊 Medium | 4×4 | light (40 slides) |
| 4 🦁 Hard | 4×4 | full |
| 5 🐲 Expert | 5×5 | full |

Two tile styles: **🔢 Numbers** (rainbow tiles, puzzles 1, 4, 7, …) and **🖼️ Picture** (the rest), where each tile is a slice of one of the ten Jigsaw pictures with a small number in the corner. Each level shows every picture once, then again mirrored. Boards are shuffled from a seed (`src/lib/sliding.ts`), so Puzzle #12 always starts the same, and always solvable. Tiles slide smoothly into the gap. 💡 Hint highlights the next tile to move; the solver (`src/lib/puzzleSolver.ts`) works for any board size. 🎯 Goal shows the finished picture or numbers. Stars: 3 with no hints, 2 with up to 2, otherwise 1.

## Word Search

Five levels, each with **30 numbered puzzles** (150 in all), in the same puzzle list as Sudoku and Jigsaw:

| Level | Grid | Words | Directions |
|---|---|---|---|
| 1 🐣 Tiny | 8×8 | 5 | across, down |
| 2 🐥 Easy | 10×10 | 6 | across, down |
| 3 🦊 Medium | 12×12 | 8 | + diagonal |
| 4 🦁 Hard | 13×13 | 10 | + backwards and up |
| 5 🐲 Expert | 15×15 | 12 | all 8 directions |

Every puzzle has a theme (Animals, Fruits, Colours, Space, Ocean, Food, Weather, Toys, Transport, My Body, Bugs, Farm, School, Music, Sports) and is built from a seed in `src/lib/wordSearch.ts`, so Puzzle #12 is always the same grid. Every listed word is really placed in the grid. Drag from the first letter of a word to the last and let go: the selection follows the finger in a straight line in any of 8 directions, and a wrong guess shows "Not a word. Try again!". Letters can also be tapped one by one; each must touch the one before, in a straight line (a tap that doesn't shows "Letters must touch in a line!" and starts a new word from that letter; tapping a picked letter takes it back). A word counts only on the cells where it is hidden, and as soon as it is spelled (or tap ✓ Check when it is also the start of a longer word, like BEE in BEETLE). Found words stay coloured on the grid. 💡 Hint lights up the first letter of a word. The clock counts up; stars: 3 with no hints, 2 with up to 2, otherwise 1.

## Sudoku

Five levels, from a tiny grid for beginners to a full hard puzzle:

| Level | Grid | Numbers given at the start |
|---|---|---|
| 1 🐣 Tiny | 4×4 (2×2 boxes) | 8 of 16 |
| 2 🐥 Small | 6×6 (2×3 boxes) | 18 of 36 |
| 3 🦊 Easy | 9×9 | 40 of 81 |
| 4 🦁 Medium | 9×9 | 32 of 81 |
| 5 🐲 Hard | 9×9 | 26 of 81 |

Each level has **50 numbered puzzles** (250 in all). Sudoku opens on a puzzle list for the chosen level showing which puzzles are solved, their stars, and the next one to play. Puzzles unlock in order within a level; all five levels are open from the start. Progress (best stars and time per puzzle) is saved on the phone (`src/lib/puzzleProgress.ts`, shared with Jigsaw).

Puzzles are generated from a seed (`src/lib/sudoku.ts`), so Puzzle #12 of a level is always the same puzzle, and each one has exactly one answer. Tap a cell, then a number. Wrong numbers turn red and count as an "oops"; correct ones lock in. 💡 Hint fills in one cell. Stars: 3 for no mistakes and no hints, 2 for up to 3, otherwise 1.

## Jigsaw

Five levels: 3×3, 4×4, 5×5, 6×6 and 7×7 pieces. Each level has **24 numbered puzzles** (120 in all), shown in a puzzle list with picture thumbnails, stars and the next one to play; they unlock in order, like Sudoku, and progress is saved on the phone.

There are ten built-in pictures: Sunny Farm, Rocket Trip, Under the Sea, Rainbow Castle, Sweet Treats, Snowy Day, Dino Land, Balloon Sky, Choo-Choo Train and Butterfly Garden. In each level, puzzles 1-10 use each picture once, 11-20 use them mirrored, and 21-24 use four of them again with a different cut. Each level starts on a different picture. Every numbered puzzle has its own fixed cut (`jigsawPuzzle` in `src/lib/jigsaw.ts`); pieces have real jigsaw tabs. Drag them from the tray onto the board; a piece snaps in when dropped close to its spot. A soft, blurry copy of the picture always sits behind the board, so players can see what they are building; 👀 makes it sharp. The pictures are drawn in code in `src/components/jigsaw/Pictures.tsx`; piece shapes are in `src/lib/jigsaw.ts`.

## Monument Valley Game

A path puzzle in the spirit of Monument Valley:
- **Goal:** connect Amit (the little white cone) to the glowing goal.
- **Turning tiles:** tap a green tile marked ↻ to rotate it 90° clockwise. Each turn counts.
- **Walking:** path tiles Amit can already reach glow gold. As soon as the gold path reaches the goal, Amit walks there without any help.
- **Par:** the fewest turns that solve the board. Match it for a perfect score.
- **Hint:** highlights the next tile to turn, worked out by a small solver.
- **100 levels in 10 chapters of 10** (The Garden, The Forest Steps, The Desert, The Sunset Palace, The Ocean Tower, The Frozen Lake, The Clockwork Spire, The Night Temple, The Star Observatory, The Summit). Swipe left and right on the route map to move between chapters. Each chapter page has its own drawn scenery to match its name (hills and flowers for The Garden, dunes and pyramids for The Desert, a lighthouse for The Ocean Tower, and so on). Boards grow from 5×5 to 8×7 and need more turns as you go.
- **Stars:** 3 for matching par without a hint, 2 for getting close (or using a hint), 1 for finishing.
- **Route map:** the game opens on a winding trail of all 100 levels. Finished levels show their stars, the next level is marked "YOU ARE HERE", and later levels are locked until you reach them. You can replay any finished level to earn more stars.
- **Saved progress:** finished levels and stars are stored on the phone and kept when the app closes.
- Every level is drawn solved and shuffled at random each time you play, so it is always solvable.

Levels 1-5 are hand-drawn in `src/lib/monumentLevels.ts`. Levels 6-100 are built by `src/lib/levelGenerator.ts` from the level number, so each level is the same layout every time.

## Fruit Pop

A match-3 game. Swipe a fruit (or tap two side-by-side fruits) to swap them; a line of 3 or more of the same fruit pops, everything above falls down and new fruits drop in. Chains of pops ("Yummy!", "Juicy!") score more.

- **Special fruits:** match 4 in a line for a **line blaster** (striped, clears its row or column), an L or T shape for a **bomb** (💥, clears the 3×3 around it), and 5 in a line for a **rainbow** 🌈 (swap it with any fruit to clear every fruit of that kind; two rainbows clear the board). Swapping two specials sets both off.
- **Goals:** each level has one: reach a score 🎯, collect a number of certain fruits 🧺, clear all the jelly squares 🍮 (some jelly needs two pops), or break all the crates 📦.
- **Obstacles:** from level 11, **crates** 📦 take the place of a fruit. Make a match next to a crate (or blast it with a special fruit) to break it; dark crates with metal corners need two hits. Fruits fall past crates. From level 21, **frozen fruits** ❄️ are stuck in ice: they can't be swapped and don't fall, but matching or blasting one melts the ice and frees the fruit. The level popup explains the obstacles before you play. Levels from 7 on have board shapes with holes (heart, diamond, donut and more); fruits fall straight through the holes.
- **Moves:** each level has a move limit. Run out and you can take **5 extra moves** once, or start over. Moves left over when you reach the goal turn into bonus points.
- **Stars:** 1 for reaching the goal, 2 and 3 for more points (shown on the score bar).
- **Map:** 60 levels on one winding road through 6 worlds (Berry Meadow, Lemon Beach, Grape Hills, Orange Grove, Melon Island, Cherry Castle). Your avatar waits on the next level; tap a level to see its goal before playing. Levels unlock in order and progress is saved on the phone.
- If you're stuck for a few seconds, two fruits that can be swapped start to wiggle. If no swap is possible, the board shuffles itself.

Levels are built from the level number in `src/lib/fruitPop.ts`, so each level is the same every time. Move limits and star scores were tuned by a robot that played each level 50 times. The move limit lets it win about 9 times in 10, with extra room on the first levels.

## Flower Pipes

Every tile holds a piece of pipe. Tap a tile to turn it a quarter turn. Join every pipe to the 💧 tap so water reaches all the flowers (they bloom from 🌱 to 🌸), with no pipe left pointing at nothing.

- **60 levels on a map** through 6 worlds (Seed Garden, Sunny Fields, Tulip Town, Cactus Canyon, Forest Falls, Rainbow Park). Boards grow from 3×3 to 7×8, and rocks appear from level 12.
- **Stars:** by taps. Each level shows how many taps earn 3 stars. A 💡 hint turns one wrong tile the right way, but limits you to 2 stars.
- Each level is a random tree of pipes that reaches every tile, so it can always be solved, and then every tile is turned at random (`src/lib/pipes.ts`).

## Maze Run

Drag the animal along the paths to its treat; it follows your finger round corners and stops at walls. Footprints show the way you came, and walking back over them rubs them out.

- **60 mazes on a map** through 6 worlds, each with its own animal and treat: Cheese Cellar 🐭🧀, Carrot Patch 🐰🥕, Bone Garden 🐶🦴, Fishy Docks 🐱🐟, Honey Woods 🐻🍯 and Bamboo Hills 🐼🎋. Mazes grow from 5×5 to 10×13.
- **Stars:** by steps. 3 stars for going (nearly) straight there; each level shows the target. 💡 Hint makes the next square on the best way glow, but limits you to 2 stars.
- Every maze is dug from a seed with a random depth-first walk, so there is exactly one route between any two squares, and the treat sits on the square furthest from the start (`src/lib/maze.ts`).

## Light Switch

Tapping a lamp switches it and the lamps above, below, left and right of it. Switch every lamp on to win; the lamps pop when they change and do a little wave when they are all lit.

- **60 levels on a map** through 6 worlds (Bedtime Lamps, Firefly Field, Lantern Street, Starry Sky, Moon Bay, Rainbow Glow). Boards grow from 3×3 to 6×6.
- **Stars:** 3 for the fewest taps possible, 2 for up to twice that (plus 2). 💡 Hint rings a lamp to tap next (max 2 stars).
- Each level starts with every lamp on and then taps some at random, so it can always be solved. A solver (on/off equations solved with XOR, then the smallest answer) works out the fewest taps and the hints (`src/lib/lights.ts`).

## Color Flood

Your paint starts in the top-left corner (🖌️). Tap a colour button, or any square of that colour, and your paint turns that colour and spreads into every touching square of it. Fill the whole board before the moves run out; the paint ripples outwards as it spreads.

- **60 levels on a map** through 6 worlds (Paint Pots, Candy Shop, Ocean Waves, Parrot Jungle, Sunset Sky, Rainbow Road). Boards grow from 6×6 with 3 colours to 12×12 with 6. Each colour also has a shape (● ▲ ■ ◆ ★ ♥) so they can be told apart without colour.
- **Moves and stars:** a helper that looks two moves ahead plays every level first. Its move count is the 3-star target, and the move limit gives a few spare moves on top (4 on the first levels, 2 on the last). Run out and you can try again. 💡 Hint circles a good colour (max 2 stars).
- Boards come from a seed (`src/lib/flood.ts`).

## Picture Cross

Number clues beside each row and above each column say how many squares in a row are coloured, in order ("2 1" = two together, a gap, then one). Colour the right squares to find the secret picture, which is then revealed in full colour in a wave.

- **30 pictures on a map** in 3 worlds: 10 at 5×5, 10 at 6×6 and 10 at 8×8 (a heart, a cat, a rocket, a penguin and more). They are drawn by hand as text in `src/lib/picross.ts`.
- **Playing:** tap a square to colour it, or drag along a row or column to colour several (the stroke stays on the line it starts along). Switch to ✖ Cross to mark squares you know are empty. A wrong square shows a red ✖ and counts as an oops. A finished row or column greys out its clue and crosses out the rest of the line by itself.
- **Stars:** 3 with no mistakes, 2 with up to 2, otherwise 1. 💡 Hint colours one square (max 2 stars).

## Prerequisites

To run this application, you'll need:

- Node.js (v14 or higher)
- Expo CLI installed (`npm install -g @expo/cli`)
- BlueStacks emulator installed (optional, for Android testing)
- A physical device or emulator for testing

## Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```
   cd puzzlegame
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Running the App with Expo

### Method 1: Using Expo CLI (Recommended)
1. In your terminal, navigate to the project directory:
   ```
   cd C:\Users\software\aiprojects\puzzlegame
   ```
2. Start the Expo development server:
   ```
   npx expo start
   ```
3. When the development server is running:
   - Press `a` to open the app in Android emulator (BlueStacks)
   - Or scan the QR code with the Expo Go app on your physical device

### Method 2: Using Expo Dev Client
1. Install Expo Dev Client on your device or BlueStacks:
   - Open BlueStacks
   - Search for "Expo" in the app store
   - Install the Expo Go app
2. Run the app using:
   ```
   npx expo run:android
   ```

### Method 3: Install an APK on BlueStacks (no Expo Go, no dev server)
This builds a standalone app with all the game code inside it. It opens from its own icon and works without the computer.

**Option A: build in the cloud with EAS** (no Android SDK needed; free Expo account)
1. Install the EAS command-line tool and log in:
   ```
   npm install -g eas-cli
   eas login
   ```
2. Build an APK (the `preview` profile in `eas.json`). The first time, say yes to creating a project and generating a keystore:
   ```
   eas build -p android --profile preview
   ```
3. When it finishes (about 10-20 minutes), download the `.apk` from the link it prints.

**Option B: build on this computer** (needs Android Studio, which brings the Android SDK and Java 17)
1. Install Android Studio. Set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk` and `JAVA_HOME` to `C:\Program Files\Android\Android Studio\jbr`.
2. Build a release APK:
   ```
   npx expo prebuild -p android
   cd android
   gradlew assembleRelease
   ```
3. The APK is `android\app\build\outputs\apk\release\app-release.apk`.

**Install it on BlueStacks:** drag the `.apk` file onto the BlueStacks window, or click **Install APK** in the BlueStacks side toolbar and pick the file. "Puzzle Games" appears on the BlueStacks home screen. To update, install a newer APK the same way; saved progress is kept.

You can also install from the command line with BlueStacks' own adb (first turn on **Settings → Advanced → Android Debug Bridge** in BlueStacks):
```
"C:\Program Files\BlueStacks_nxt\HD-Adb.exe" connect 127.0.0.1:5555
"C:\Program Files\BlueStacks_nxt\HD-Adb.exe" install -r path\to\app.apk
```

For Google sign-in in this APK, register the SHA-1 of the key it was signed with (see [Setting up Google sign-in](#setting-up-google-sign-in)): for EAS, run `eas credentials` and copy the SHA-1 fingerprint; for a local build, `gradlew signingReport` (release builds are signed with the debug key unless you set up your own).

## Running on Physical Device

To run the app on a physical Android device:
1. Connect your device via USB
2. Enable USB debugging in developer options
3. Run:
   ```
   npx expo start
   ```
4. Scan the QR code with the Expo Go app on your device

## Setting up Google sign-in

Everything else works in Expo Go. Google sign-in needs two extra things, done once:

**1. Run an installed build instead of Expo Go.** Expo Go doesn't include the Google sign-in code, so there the button is greyed out. Build and install the app on the emulator or phone (needs Android Studio / the Android SDK):

```
npx expo run:android
```

This creates the `android/` folder, installs "Puzzle Games" (package `com.puzzlegames.app`, set in `app.json`) and starts Metro. After that, `npx expo start` works as before and opens the installed app instead of Expo Go.

**2. Register the app with Google** in the [Google Cloud Console](https://console.cloud.google.com/):

1. Create a project (or pick one).
2. **APIs & Services → OAuth consent screen:** choose *External*, fill in the app name and your support email. While the app is in *Testing*, add the Google accounts that may sign in under *Test users*.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Android:**
   - Package name: `com.puzzlegames.app`
   - SHA-1 certificate fingerprint of the key the app is signed with. For the debug build made by `npx expo run:android`, run this and copy the `SHA1` line of the `debug` variant:
     ```
     cd android
     ./gradlew signingReport
     ```
     A release or EAS build is signed with a different key: add another Android client with that key's SHA-1.

No client ID goes into the code: Google recognises the app by its package name and SHA-1. If they don't match, tapping **Sign in with Google** shows "Google sign-in isn't set up for this app yet".

The sign-in code is in `src/lib/google.ts`.

**Privacy:** the app only asks Google for the basic profile (name and email). The email is shown on the player's profile and is saved only on the phone, like everything else. If you publish the app for children, check Google Play's Families policy and children's privacy rules (such as COPPA) before offering Google sign-in to kids.

## Project Structure

```
puzzlegame/
├── App.tsx                  # Entry point: home menu and switching between screens
├── app.json                 # Expo app settings (name, orientation, Android package)
├── tsconfig.json            # TypeScript settings (strict mode)
├── package.json             # Dependencies and scripts
└── src/
    ├── theme.ts             # Shared colours, game colours, font and corner sizes
    ├── screens/             # One file per game, plus profile and leaderboard
    │   ├── SlidingPuzzle.tsx
    │   ├── WordSearchGame.tsx
    │   ├── NumberMatchGame.tsx
    │   ├── MonumentValleyGame.tsx
    │   ├── SudokuGame.tsx
    │   ├── JigsawGame.tsx        # Picture/level setup and the drag-and-drop board
    │   ├── FruitPopGame.tsx      # Match-3 board, goals, specials and animations
    │   ├── PipesGame.tsx         # Pipe-turning board
    │   ├── MazeGame.tsx          # Maze Run: drag the animal through the maze
    │   ├── LightsGame.tsx        # Light Switch lamp grid
    │   ├── FloodGame.tsx         # Color Flood board and paint buttons
    │   ├── PicrossGame.tsx       # Picture Cross clues, painting and reveal
    │   ├── AccountsScreen.tsx    # "Who's playing?": pick a player, new player, Google sign-in
    │   ├── ProfileScreen.tsx     # Gamer name, avatar, log out and trophies
    │   └── LeaderboardScreen.tsx # Top 10 per game and play history
    ├── components/          # Reusable UI pieces
    │   ├── AppText.tsx      # Text with the rounded Fredoka font
    │   ├── ChunkyButton.tsx # Rounded 3D button used everywhere
    │   ├── WinCard.tsx      # End-of-game card with stats, stars, confetti and buttons
    │   ├── Confetti.tsx     # Falling confetti for the win card
    │   ├── MapGame.tsx      # Shared level-map game: progress, map, play, back button
    │   ├── PlayParts.tsx    # Shared top row, stat pills and level info for map games
    │   ├── Popup.tsx        # Popup wrapper with the ✕ close button (all popups use it)
    │   ├── HowToPlay.tsx    # How-to-play popup and the ❓ button used in every game screen
    │   ├── tutorial/
    │   │   ├── TutorialPlayer.tsx # The animated tutorial player (hand, captions, controls)
    │   │   ├── demos.tsx  # One scripted tutorial scene per game
    │   │   └── demosMore.tsx # Tutorials for Maze Run, Light Switch, Color Flood, Picture Cross
    │   ├── LevelPicker.tsx  # Row of 5 level buttons (Sudoku, Jigsaw)
    │   ├── PuzzleList.tsx   # Numbered puzzle list with progress (Sudoku, Jigsaw)
    │   ├── LevelMap.tsx     # Winding level map with worlds and stars (Fruit Pop, Flower Pipes and the new map games)
    │   ├── jigsaw/
    │   │   └── Pictures.tsx # The ten jigsaw pictures, drawn with SVG
    │   └── monument/        # Monument Valley pieces
    │       ├── RouteMap.tsx # Map of all 100 levels and your progress
    │       ├── LevelPlay.tsx# Playing one level
    │       ├── ChapterScene.tsx # Drawn background scenery for each chapter
    │       └── palette.ts   # Shared pastel colours
    └── lib/                 # Game logic with no UI
        ├── sliding.ts       # Sliding Puzzle levels, numbered puzzles and shuffles
        ├── puzzleSolver.ts  # Hint solver for the sliding puzzle (any size)
        ├── pathPuzzle.ts    # Monument Valley tile logic and solver
        ├── monumentLevels.ts # Hand-drawn levels 1-5
        ├── levelGenerator.ts # Levels 6-100, chapters and level names
        ├── progress.ts      # Saved progress and star ratings
        ├── profile.ts       # Gamer name and avatar helpers
        ├── accounts.ts      # Players on the phone, who is logged in, per-player save keys
        ├── google.ts        # Sign in with Google (installed builds only)
        ├── wordSearch.ts    # Word Search levels, themes and puzzle builder
        ├── sudoku.ts        # Sudoku levels, numbered puzzles, generator and solver
        ├── puzzleProgress.ts # Saved progress per level and puzzle (Sudoku, Jigsaw, map games)
        ├── random.ts        # Seeded random numbers (Sudoku, Monument Valley)
        ├── jigsaw.ts        # Jigsaw levels and piece outlines
        ├── fruitPop.ts      # Fruit Pop levels and the match-3 engine
        ├── pipes.ts         # Flower Pipes levels, water flow and stars
        ├── maze.ts          # Maze Run levels, maze digging and routes
        ├── lights.ts        # Light Switch levels and the fewest-taps solver
        ├── flood.ts         # Color Flood levels, paint spreading and the helper
        ├── picross.ts       # Picture Cross pictures and clues
        ├── sound.ts         # Sound effects, buzzes and the mute setting
        ├── useBackHandler.ts # Phone back button hook
        ├── howToPlay.ts     # How-to-play text for every game
        ├── scores.ts        # Leaderboard, history and ranking rules
        └── useRecordPlay.ts # Hook games use to save a finished game
```

## Type checking

The app is written in TypeScript. Run `npm run typecheck` to check every file for type errors.

## Customization

You can customize the games by:
- Hand-drawing Monument Valley levels in `src/lib/monumentLevels.ts` (the first entries replace generated ones)
- Modifying colors and styling in the StyleSheet objects
- Adjusting difficulty settings
- Implementing additional puzzle mechanics like gravity, teleportation, or color matching
- Adding sound effects or music

## Contributing

Feel free to fork this repository and submit pull requests for improvements or new features.

## License

This project is available under the MIT License.