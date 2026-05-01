# FORGE Training Context

FORGE is a pocket HYROX coach for athletes preparing for a race across different gym environments. It turns athlete goals, equipment availability, benchmark data, and fatigue feedback into executable training sessions.

## Language

**Athlete**:
A signed-in user preparing for a HYROX race.
_Avoid_: customer, trainee

**Race Goal**:
The athlete's race date, target finish time, category, and division-relevant profile data.
_Avoid_: event config, target

**Microcycle**:
A seven-day training plan anchored to a start date.
_Avoid_: week plan, schedule

**Session**:
One day's executable training prescription inside a **Microcycle**.
_Avoid_: workout day, calendar item

**Workout Block**:
A coherent portion of a **Session**, such as warm-up, running, strength, HYROX station work, or cool-down.
_Avoid_: exercise group, section

**Training Stimulus**:
The intended adaptation of a **Workout Block**, such as aerobic base, threshold running, strength, race pace, or compromised running.
_Avoid_: vibe, focus

**Equipment Availability**:
The equipment an athlete can use in the current gym or travel setting.
_Avoid_: equipment settings when referring to today's gym

**Substitution**:
A replacement **Workout Block** that preserves the original **Training Stimulus** when equipment is unavailable.
_Avoid_: swap when documenting domain rules

**Fatigue Signal**:
Post-session feedback such as RPE, completion status, notes, and pain or soreness indicators.
_Avoid_: feedback when referring to training readiness

**Run Prescription**:
A running-specific instruction with distance, pace, heart-rate target, and training purpose.
_Avoid_: cardio block

## Relationships

- An **Athlete** has one current **Race Goal**.
- A **Microcycle** contains exactly seven **Sessions**.
- A **Session** contains zero or more **Workout Blocks**.
- A **Workout Block** has one or more **Training Stimuli**.
- A **Substitution** replaces one **Workout Block** while preserving its primary **Training Stimulus**.
- **Fatigue Signals** influence future **Microcycles**.

## Example Dialogue

> **Dev:** "If today's gym has no sled, should we just ask the LLM for a swap?"
> **Domain expert:** "No. Create a **Substitution** that preserves the original **Training Stimulus**. A sled push day should still feel like heavy lower-body push plus compromised running, even without a sled."

## Flagged Ambiguities

- "plan" can mean the long-term app roadmap or a seven-day training plan. In the training domain, use **Microcycle**.
- "equipment settings" can mean the athlete's default gym profile or today's available gym equipment. Use **Equipment Availability** for the current gym context.
