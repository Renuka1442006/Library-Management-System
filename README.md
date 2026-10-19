# Library Management System

A lightweight library dashboard for managing a book collection and student loans. The frontend uses HTML, CSS, and vanilla JavaScript; a small Express server serves the app and exposes a health check.

> **Storage note:** Book and loan records are saved in the browser's LocalStorage. They are not stored by Express or shared between browsers or devices.

## Features

- Add, edit, search, and filter book records by ID, title, author, or category.
- Track total copies and calculate available copies from active loans.
- Issue books to students and record returns.
- View collection and loan totals on the dashboard.
- Save changes in the current browser profile between visits.
- Check whether the Express server is available from the dashboard.

## Live deployment

The application is deployed on Render and can be opened at [library-management-api-mjab.onrender.com](https://library-management-api-mjab.onrender.com). The service health endpoint is available at [`/api/health`](https://library-management-api-mjab.onrender.com/api/health).

Book and loan records are still saved in each visitor's browser LocalStorage; using the live site does not share records between users or devices.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- npm
- A modern web browser

## Get started

From the project directory, install dependencies and start the server:

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To use a different port:

```powershell
$env:PORT = 4000
npm start
```

In macOS or Linux, use `PORT=4000 npm start` instead.

## Run with Docker

Docker Hub repository: [sakshinagare2112/devops](https://hub.docker.com/repository/docker/sakshinagare2112/devops).

To download the published `latest` image and run it:

```sh
docker pull sakshinagare2112/devops:latest
docker run --rm -p 3000:3000 sakshinagare2112/devops:latest
```

Then open [http://localhost:3000](http://localhost:3000).

Alternatively, build and run the image locally from the project directory:

```sh
docker build -t library-management-system .
```

Start the container and publish the app on port `3000`:

```sh
docker run --rm -p 3000:3000 library-management-system
```

Then open [http://localhost:3000](http://localhost:3000). To use a different host port, for example `8080`, run `docker run --rm -p 8080:3000 library-management-system` and open [http://localhost:8080](http://localhost:8080).

## Using the dashboard

### Manage books

Select **Add a book** and provide a unique book ID, category, title, author, and a positive whole-number copy count. Use **Edit** to update a book's details or quantity. While copies are on loan, the quantity cannot be reduced below the number of active loans.

Use the search box to match a book ID, title, or author, and the category menu to narrow the collection. The dashboard shows total titles, physical copies, available copies, and currently issued copies.

### Issue and return books

Select **Issue** on a book with an available copy, then enter the student's name and ID and confirm the issue date. The loan appears in **Recent loans**. Select **Return** and confirm when the book is returned; the return date is recorded and that copy becomes available again.

A book with an active loan cannot be deleted. Return its outstanding loans first.

## Data and privacy

The app stores records in these browser LocalStorage entries:

- `libraryBooks` — book IDs, titles, authors, categories, and copy counts.
- `libraryTransactions` — issue IDs, book and student details, issue dates, and return dates.

Records persist across page refreshes and server restarts in the same browser profile. They are not synced to another browser or device. Clearing this site's browser data removes them. If saved data is malformed, the app reports the problem and starts the affected list empty.

This project does not include user accounts, a database, or server-side persistence. Do not use it as a shared or authoritative library record system without adding appropriate server-side storage, access controls, and data synchronization.

## Server health endpoint

The dashboard checks the server at `GET /api/health` when it loads and every 15 seconds. A successful response looks like:

```json
{
  "status": "ok",
  "message": "Library frontend server is running. Library records stay in browser LocalStorage."
}
```

The health indicator reports when the server is unavailable. An already-open page may still display and update its in-memory data, but saved changes require browser LocalStorage and will not synchronize through the server.

## Project structure

```text
.
├── public/
│   ├── index.html   # Dashboard markup and forms
│   ├── script.js    # UI behavior, validation, LocalStorage, health checks
│   └── style.css    # Responsive styles
├── Dockerfile       # Container image definition
├── .dockerignore    # Excluded Docker build context files
├── package.json     # Project metadata, Express dependency, start command
└── server.js        # Express static server and health endpoint
```

## Available command

| Command | Description |
| --- | --- |
| `npm start` | Start the Express server (port `3000` by default). |
