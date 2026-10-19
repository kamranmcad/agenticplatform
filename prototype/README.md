# Agents Platform — tenant console prototype

A front-end-only prototype of a multi-tenant SaaS platform for building, running and governing digital workers. Every screen is scoped to one tenant, **Acme Gov** (Pro plan, UAE region). There's no backend, database, or auth. All data is mock data in `js/data.js`, and a page refresh resets every change.

## Run
```
powershell -ExecutionPolicy Bypass -File serve.ps1
```
Then open http://localhost:5180/. It needs internet access for the Tailwind, Lucide, and Google Fonts CDNs.

## Look and layout (Horizon theme)
- Navy sidebar with a tenant card at the top (plan, region, isolation, seats), grouped sections, and a collapse button.
- Each section opens a hub of tiles, each with a live count and an alert, before you reach the detail pages.
- The top bar has breadcrumbs, **Nova** (command bar and assistant, Ctrl K), EN/عربي, notifications, and the user menu.
- Colours: teal accent, coral for alerts, and a soft canvas background. Fonts: Plus Jakarta Sans, with IBM Plex Sans Arabic for RTL.

## Sections
| Section | State | Pages |
|---|---|---|
| Command center | Detailed | Pulse metrics, "Needs you", section launcher, your workers |
| Studio | Detailed | Digital workers (blueprint editor, sandbox, releases, resolved settings, reach and control tabs), Flows (canvas designer, checks, dry run, releases), Squads, Playbooks, Library, Connectors |
| Tenant admin | Detailed | Org structure, Template gallery, Subscription, Configuration (14 areas) |
| Live ops, Insights, Assurance, Oversight | Later phase | Hub and preview pages |
| Work mode | Basic | End-user chat with workers |

## Vocabulary
| Term | Meaning |
|---|---|
| Digital worker | An AI agent |
| Blueprint | Its declarative definition |
| Release / working copy | Published version / draft |
| Audience | Public, staff, or system |
| Human checkpoint | A pause for human approval |
| Action guard | Policy enforcement on every tool call |
| Access | A tool grant |
| Unit | An org node |
| Key | Identifier, used instead of "slug" |
| Squad | A lead worker plus helpers |
| Playbook | A reusable procedure |
| Library | Knowledge collections |
| Connector | An integration |

## Files
- `js/shell.js`: sidebar, top bar, Nova, login, work mode, routing
- `js/pages/home.js`: the Command center
- `js/pages/hubs.js`: section hubs and tile definitions
- `js/pages/agents.js` and `js/pages/agent-builder.js`: digital workers and the blueprint editor
- `js/pages/workflows.js`: the flow designer
- `js/pages/knowledge.js`: Library
- `js/pages/integrations.js`: Connectors
- `js/pages/admin.js`: Tenant admin
- `js/pages/parked.js`: later-phase previews
