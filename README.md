WebWander

Discover the internet one site at a time.

WebWander is an interactive website that visualizes the internet as a galaxy.
Each star represents a website, connections represent relationships, and clusters represent categories.

The project powers the official landing page for the WebWander Chrome extension, allowing users to explore and discover interesting websites in a visual, interactive way.

Features

🌌 Galaxy Visualization – Websites displayed as stars in a navigable galaxy

🔗 Connected Web – Related websites are linked together

🧭 Explore Categories – Discover clusters of websites by topic

🚀 Wander the Web – Randomly jump to new websites to explore

✨ Interactive UI – Animated stars, glowing connections, and fullscreen navigation

🧩 Chrome Extension Integration – Works alongside the WebWander browser extension

Project Structure
WebWander-website/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── data-loader.js
│   ├── galaxy.js
│   └── main.js
├── data/
│   └── sites.json
└── README.md

Running Locally

You can run the site locally using any simple web server.

Python
python -m http.server 8000

Node
npx serve .


Then open:

http://localhost:8000

Deployment

The site can be deployed easily using GitHub Pages.

Push the repository to GitHub

Open Settings → Pages

Select Deploy from a branch

Choose the main branch and / (root) folder

Save

Your site will be available at:

https://<username>.github.io/<repo-name>/

Chrome Extension

WebWander also exists as a Chrome extension designed to help users discover interesting websites while browsing.

The extension integrates with the WebWander ecosystem and provides quick access to website discovery features.

Contributing

Contributions are welcome.

If you'd like to improve WebWander:

Fork the repository

Create a new branch

Make your changes

Submit a pull request

Ideas for contributions include:

Improving the galaxy visualization

Adding new discovery features

Expanding the website dataset

UI/UX improvements

Performance optimization

License

MIT License
