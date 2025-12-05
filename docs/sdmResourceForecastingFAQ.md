# FAQ & Model Insights

<details>
<summary>1. How are 'Effective Engineers', 'SDE-Weeks', and 'SDE-Days' calculated now?</summary>

This forecast model estimates the *productive engineering capacity available for project work* after accounting for hiring delays, ramp-up, attrition, and non-project time defined in the 'Tune Capacity Constraints' section.

- **Foundation:** The model tracks 'Total Headcount' (Purple line) based on current engineers, hiring pipeline, and attrition. It also tracks 'Total Ramped Up Engineers' (Green dashed line), which lags headcount based on the 'Ramp-up Time' input.
- **Capacity Integration:** The crucial step is determining the actual productive time per engineer. Instead of a simple efficiency %, the model calculates the **'Net Available Days per Week per SDE'** for the selected team. This calculation uses the values you configured in the 'Tune Capacity Constraints' page:
    - The 'Standard Working Days Per Year' set globally.
    - Deductions for global Public Holidays and Org-Wide Events.
    - Deductions for Standard Leave types (like Annual, Sick), adjusted by the team's specific 'Uptake %'.
    - Deductions based on the team's 'Avg. Overhead (Hrs/Week/SDE)' for recurring meetings, admin, etc.
    - Deductions for per-SDE 'Team Activities' (like training days).
    - *(Note: Variable Leave like Maternity/Paternity and 'Total Team Days' activities configured in Capacity Constraints affect the *overall* team capacity but aren't factored into this *per-SDE* availability calculation directly).*
    
    (Check the browser console logs when generating the forecast for a detailed breakdown of this calculation for the selected team).

- **Effective Engineers (Blue Line):** This is calculated weekly as: 'Total Ramped Up Engineers' × ('Net Available Days per Week per SDE' / 5). It represents the SDEs effectively available for project work that week.
- **SDE-Weeks (Monthly Table):** The sum of the weekly 'Effective Engineers' values for all weeks falling within that calendar month.
- **SDE-Days (Monthly Table):** The sum over the weeks in that month of (Weekly 'Effective Engineers' × 'Net Available Days per Week per SDE'). This gives a more precise measure of total productive days.

*Auditor's Note:* This integrated approach grounds the forecast in the more detailed capacity planning done elsewhere, providing better traceability than a subjective efficiency percentage. However, the accuracy still relies on the quality of inputs in *both* the forecasting tool *and* the Capacity Constraints configuration.
</details>

<details>
<summary>2. Why is 'Effective Engineers' (Blue) lower than 'Total Ramped Up Engineers' (Green Dashed)?</summary>

The Green dashed line shows the number of engineers who have completed their ramp-up period. The Blue line shows how much *productive project capacity* those ramped-up engineers represent.

The Blue line will be lower than the Green line whenever the calculated 'Net Available Days per Week per SDE' is less than 5. This difference represents the proportion of a ramped-up engineer's time consumed by configured non-project factors like leave, holidays, recurring overhead, org events, and per-SDE team activities (as defined in 'Tune Capacity Constraints').

If the lines overlap, it means the net available days calculated to 5.00, indicating minimal or no capacity sinks were configured for that team.
</details>

<details>
<summary>3. How is the 'Est. Hires Required' calculated?</summary>

The text "Est. Hires Required: X by Week Y (~Z/week)" aims to provide a practical hiring target.

- The underlying model first calculates the *minimum constant weekly hiring rate* (Z) needed to make the 'Total Headcount' reach the 'Funded Team Size' precisely by the 'Target Week to Close Funding Gap', accounting for the specified 'Average Hiring Time' and 'Annual Attrition Rate'. This rate is often fractional.
- To provide a more actionable number, the tool then estimates the total number of *whole* hires (X) needed. This includes the initial gap ('Funded Size' - 'Current Available Engineers') plus an estimate of the cumulative attrition expected to occur between the start and the target week.

*Manager Tip:* Use the 'Est. Hires Required' as your primary target. The average weekly rate gives context on the required velocity. Plan hiring activities realistically – you hire whole people, often in batches, not fractions per week.
</details>

<details>
<summary>4. How does Attrition work in this model? What are its limitations?</summary>

The model applies attrition based on the 'Annual Attrition Rate (%)' input.

- The annual percentage is converted into a weekly rate.
- Each week, this rate is applied to the *current total headcount* (including engineers still ramping up).
- Fractional attrition accumulates, and whole engineers are removed from the headcount (deducted from ramped-up engineers first, then ramping engineers) when the fraction crosses an integer.

**Limitations (Critical View):**
- **Linear/Constant Rate:** Assumes attrition occurs evenly throughout the year. Reality is often uneven (e.g., lower initially for new hires, peaks after bonus cycles, market shifts).
- **Applied to All:** Applies the same rate to everyone currently on the team, regardless of tenure or ramp-up status.

*Manager Tip:* Use an annual rate that reflects your best *overall* estimate for the team's expected turnover during the forecast period. Be aware of the model's simplification.
</details>

<details>
<summary>5. How does Ramp-up Time work? What are its limitations?</summary>

New hires enter the simulation after the 'Average Hiring Time'. They immediately count towards 'Total Headcount' (Purple line).

- They remain in a 'ramping' state for the number of weeks specified in 'Ramp-up Time'.
- Only *after* completing this period do they contribute to 'Total Ramped Up Engineers' (Green dashed line) and subsequently to 'Effective Engineers' (Blue line).

**Limitations (Critical View):**
- **Binary State:** Assumes 0% productivity during ramp-up, then instantly 100% productivity afterwards. Real ramp-up is usually a gradual curve.
- **Uniform Time:** Assumes the same ramp-up time for all hires, regardless of level or role complexity.

*Manager Tip:* Set 'Ramp-up Time' to the average duration until a new hire consistently delivers close to their expected full capacity. Factor in onboarding quality, role complexity, and expected experience level of hires.
</details>

<details>
<summary>6. How should I choose the manual input values (Hiring, Ramp-up, Attrition, Target Week)?</summary>

- **Hiring Time:** Use historical data (job req approval to start date) if possible. Include sourcing, interviews, offer, notice periods. Be realistic about current market conditions.
- **Ramp-up Time:** Estimate based on role complexity, required domain knowledge, onboarding effectiveness, and typical new hire experience.
- **Attrition Rate (%):** Base on historical team/org data, adjusted for current morale, compensation competitiveness, and market trends. If unsure, it might be safer to slightly overestimate attrition.
- **Target Week:** Set an ambitious but *achievable* target. Consider your recruitment team's capacity and the calculated hiring rate. An impossible target week (e.g., less than hiring time) will generate an error.

*Important:* These parameters are specific to *this forecast run* and are **not** currently saved per team in the application data model. You need to re-enter them each time you run a forecast.
</details>

<details>
<summary>7. What are the key assumptions and limitations of this forecasting model?</summary>

Like any model, this one makes simplifying assumptions. Understanding them is crucial for interpreting the results:

- **Linear Attrition:** Assumes a constant rate spread evenly over the year (see Q4).
- **Binary Ramp-Up:** Assumes hires are non-productive then fully productive (see Q5).
- **Constant Hiring Rate (for calculation):** Calculates the *required* rate as a constant average; actual hiring may vary.
- **Simplified Hiring Pipeline:** Assumes hires start exactly after 'Hiring Time'; doesn't model candidate drop-off or variable time-to-fill.
- **Capacity Based on Snapshot:** Uses the current 'Tune Capacity Constraints' data; doesn't forecast *changes* to leave policies, overhead levels, etc., during the year.
- **Deterministic Model:** Doesn't incorporate probability or risk ranges (e.g., best/worst case for hiring or attrition).
- **No Cost Modeling:** Focuses purely on headcount/SDE capacity, not budget implications.
- **Fixed Horizon:** Currently limited to a 52-week forecast.

*Auditor's Note:* While useful for visualizing potential trajectories based on inputs, the outputs are sensitive to these assumptions. Use the forecast for planning discussions and scenario analysis ("what-if") rather than as a precise prediction.
</details>

<details>
<summary>8. What are potential future improvements for this forecasting model?</summary>

Based on the current model's limitations and standard industry practices, potential future enhancements could include:

- **Dynamic Inputs:** Modeling non-linear attrition (e.g., seasonal), variable hiring rates (e.g., freezes/bursts), and gradual productivity ramp-up curves.
- **Persistence:** Saving forecast input parameters per team.
- **Scenario Comparison:** Ability to save and compare different forecast scenarios (e.g., optimistic vs. pessimistic attrition).
- **Risk Modeling:** Incorporating uncertainty using ranges or Monte Carlo simulations.
- **Cost Integration:** Adding salary bands or cost estimates to model budget impact.
- **More Granularity:** Allowing different parameters based on engineer level or role.
- **Historical Data Integration:** Using past hiring/attrition data to calibrate the model.
- **Extended Time Horizon:** Allowing forecasts beyond one year.
- **Enhanced Visualizations:** Offering different chart types for analysis.
- **Project Linking:** Connecting forecasted capacity to planned project demands (a major integration).
</details>
