# Agents Platform — prototype

A clickable, front-end-only prototype of a multi-tenant SaaS platform for building, running and governing digital workers. It shows one tenant, Acme Gov.

- The app is in [`prototype/`](prototype/). See [prototype/README.md](prototype/README.md) for screens, vocabulary and files.
- It's deployed on Netlify from this repository. `netlify.toml` publishes the `prototype/` folder, with no build step.
- To run it locally: `powershell -ExecutionPolicy Bypass -File prototype/serve.ps1`, then open http://localhost:5180/.

This is mock data only, with no backend.
