# DuoDuel ⚔️

A playable browser prototype for a Duolingo case competition: two quick Spanish word games that each earn **personal gems** and fill a **shared squad gem chest**.

All players, squads and scores are **demo data**. There is no login, backend, database or external API, only three static files.

| File | What's inside |
| --- | --- |
| `index.html` | Screens: hub, Word Vault, Hidden Connections, results |
| `style.css` | Shared design tokens, buttons, layouts and animations |
| `game.js` | All curated word data, game rules, scoring, gems, streak and squad logic |

## The two games

**🗝️ Word Vault** builds a four-step synonym chain that starts from *feliz*. Each step offers a common synonym (100 pts), a rarer synonym (200 pts) and one wrong word. Every consecutive first-try correct answer adds a combo bonus (+50, +100, +150). A wrong pick explains why and lets you retry. It resets the combo but never takes away points.

**🧩 Hidden Connections** asks you to sort 16 Spanish words into 4 hidden groups (Animals, Fruits, Colors, False friends). Each solved group is worth 100 pts. If you finish, each unused mistake (4 allowed) adds +50. The hint shows one category and one word in it, and lowers the maximum reward by 150 pts. The live **💎 max** badge shows the best you can still earn.

**Gems:** 10 points = 1 gem. Gems go to your personal total *and* the squad chest.

**Saved in localStorage:** personal gems, this week's squad contribution, day streak, and today's best score per game. Replays count as practice, so nothing is wiped. Use *Reset demo progress* on the hub to start a demo fresh.

**Demo shortcuts:** in Word Vault, press `1`–`3` to pick and `Enter` to continue. In Hidden Connections, `Enter` checks the selected words.

## Where to change things

- Words, meanings and example sentences: `WORD_VAULT` at the top of `game.js`
- Categories and words: `CONNECTIONS`
- Point values: `pointsByRarity`, `comboStep`, `pointsPerGroup`, `pointsPerSpareMistake`, `hintCost`, `POINTS_PER_GEM`
- Teammates, rival squads, chest goal: `SQUAD`

## Preview locally

Open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Publish on GitHub Pages

1. Push the files to your repository's default branch.
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**. Pick your branch and the `/ (root)` folder, then save.
4. After about a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

---

Student prototype for a case competition. Not an official Duolingo product. Illustrations are emoji and simple CSS shapes.
