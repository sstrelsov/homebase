# Stached (UI)

The game's front end: login, home screen, a day's board, stache clock, past games, leaderboard, dialogs, and push notifications (`push.ts`). Home asks for two things in a dialog, with drawings of an iPhone (`IPhone.tsx`): in a browser tab, to add Stached to the home screen (`HomeScreen.tsx`), and in the home-screen app, to turn on notifications (`NotificationsDialog.tsx`). A browser tab that can get them shows a bell instead. The page, `src/pages/Stached.tsx`, holds the session (`session.ts`), and each screen is a route inside it.

How the whole game works (the API, puzzles, deploying, migrations, backups, and the Studio and Cloudflare setup) is in [`stached-api/README.md`](../../stached-api/README.md).
