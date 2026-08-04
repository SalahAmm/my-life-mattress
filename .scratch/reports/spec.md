# Reports Spec

Owner-only reports effort per the brief (5.5): date ranges, KPIs, breakdown, A4 print, CSV.

## Decisions locked

- **Outputs**: A4 print (preview + Electron + browser pipeline) AND CSV export (UTF-8 BOM, escaped) — both previewed before action.
- **Breakdown**: per product+variant (units + revenue), top 20 by revenue.
- **Ranges**: Aujourd'hui / Cette Semaine (Monday start) / Ce Mois / Cette Année + custom picker.
- **KPIs**: Chiffre d'affaires, Acomptes collectés, Solde en attente (outstanding), Nombre de ventes.
- Cancelled sales excluded from totals but visible/filterable separately; local time.
- Enforced owner-only at the IPC layer.
