# Developer's Guide

To develop games for Astragames, simply:

1. Add your game in a folder in the `games/` folder
2. Add your game to the `games.json` file
3. Add a screenshot to the `images/` folder

## How to add to the `games.json`

Use this format:

```json
{
  "id": "use this for the image and folder name as well",
  "title": "Title for your game",
  "description": "A description here.",
  "image": "images/ID.png",
  "url": "games/ID/index.html",
  "tags": [
    "add tags here, see games.json for all tags"
  ],
  "rating": 4.5,
  "categories": [
    "add categories here, see games.json for all categories"
  ],
  "ribbon": "can be new, updated, popular, or astragames exclusive"
}
```

## How to use the Astragames SDK

To use the Astragames SDK, simply import the `sdk/astragames.js` file in your JavaScript.

```javascript
import Astragames from './sdk/astragames.js';

const astra = new Astragames();
```

**Note:** Make sure your script is set to `type="module"`

Then:

```javascript
// Registering achievements
astra.registerAchievement('achievement_id', 'Name', 'Description', 'fa-icon-name');

// Earning achievements
astra.earnAchievement('achievement_id');

// Checking if an achievement is earned
if (astra.hasAchievement('achievement_id')) {
  // ...
}
```