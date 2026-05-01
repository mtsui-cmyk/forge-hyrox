# Training state is database-first

FORGE stores athlete profile, equipment availability, microcycles, daily logs, and benchmark PRs in the database as the source of truth. Browser localStorage may cache this data for responsiveness, but clearing localStorage or changing browsers must not destroy an athlete's training state.
