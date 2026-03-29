"""
Nebraska NDE – Interactive Chart (Dash)

LOCAL RUN:
    pip install dash pandas plotly
    python nde_dash.py
    open http://127.0.0.1:8050

DEPLOY TO RENDER:
    1. Save your data in notebook:  filt.to_csv("nde_data.csv", index=False)
    2. Push these 3 files to GitHub:
           nde_dash.py
           requirements.txt
           nde_data.csv
    3. Render → New Web Service → connect repo
       Start command:  python nde_dash.py
    4. Share the URL Render gives you with your client.
"""

import os
import dash
from dash import dcc, html, Input, Output
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

# ─────────────────────────────────────────────
# 1. LOAD DATA
# Run this once in your notebook to create the CSV:
#   filt.to_csv("nde_data.csv", index=False)
# ─────────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "nde_data.csv")

filt = pd.read_csv(DATA_PATH, dtype={"GRADE": str})
filt["YEAR"] = filt["YEAR"].astype(int)

GRADES  = ["3", "4", "5", "6", "7", "8", "11"]
GENDERS = ["Male", "Female"]

filt = filt[
    filt["GRADE"].isin(GRADES) &
    filt["SUBGROUPDESCRIPTION"].isin(GENDERS)
]

SUBJECTS = sorted(filt["SUBJECT"].dropna().unique().tolist())
print(f"Loaded {len(filt):,} rows | Subjects: {SUBJECTS}")

# ─────────────────────────────────────────────
# 2. COLOR MAP
# ─────────────────────────────────────────────
all_districts = sorted(filt[filt["LEVEL"] == "DI"]["NAME"].unique())
palette = (px.colors.qualitative.Alphabet +
           px.colors.qualitative.Dark24 +
           px.colors.qualitative.Light24 +
           px.colors.qualitative.Pastel +
           px.colors.qualitative.Set1)
palette   = palette * ((len(all_districts) // len(palette)) + 1)
color_map = {name: palette[i] for i, name in enumerate(all_districts)}

tick_vals  = [2018, 2019, 2021, 2022, 2023, 2024, 2025]
tick_texts = ["2017-18", "2018-19", "2020-21", "2021-22",
              "2022-23", "2023-24", "2024-25"]

gender_style = {
    "Male"  : dict(dash="solid",  symbol="circle"),
    "Female": dict(dash="dot",    symbol="diamond"),
}

# ─────────────────────────────────────────────
# 3. LAYOUT
# ─────────────────────────────────────────────
app = dash.Dash(__name__)
app.title = "Nebraska NDE"
server = app.server   # needed by Render

LABEL_STYLE = lambda color: {
    "fontSize": "10px", "fontWeight": "700",
    "textTransform": "uppercase", "letterSpacing": "0.6px",
    "color": color,
}

app.layout = html.Div([

    # ── Toolbar ──────────────────────────────────────────────────────────
    html.Div([

        html.Span("Nebraska NDE", style={
            "fontWeight": "700", "fontSize": "15px",
            "color": "#333", "whiteSpace": "nowrap",
        }),

        html.Div(style={"width": "1px", "height": "36px",
                        "background": "#ddd", "flexShrink": "0"}),

        # Subject dropdown
        html.Div([
            html.Label("Subject", style=LABEL_STYLE("#2a7a4f")),
            dcc.Dropdown(
                id="subject-dd",
                options=[{"label": s, "value": s} for s in SUBJECTS],
                value=SUBJECTS[0],
                clearable=False,
                style={"minWidth": "210px", "fontSize": "13px"},
            ),
        ], style={"display": "flex", "flexDirection": "column", "gap": "3px"}),

        # Grade dropdown
        html.Div([
            html.Label("Grade", style=LABEL_STYLE("#457B9D")),
            dcc.Dropdown(
                id="grade-dd",
                options=[{"label": f"Grade {g}", "value": g} for g in GRADES],
                value="3",
                clearable=False,
                style={"minWidth": "140px", "fontSize": "13px"},
            ),
        ], style={"display": "flex", "flexDirection": "column", "gap": "3px"}),

        # Gender dropdown
        html.Div([
            html.Label("Gender", style=LABEL_STYLE("#E63946")),
            dcc.Dropdown(
                id="gender-dd",
                options=[
                    {"label": "Male & Female", "value": "both"},
                    {"label": "Male only",     "value": "Male"},
                    {"label": "Female only",   "value": "Female"},
                ],
                value="both",
                clearable=False,
                style={"minWidth": "160px", "fontSize": "13px"},
            ),
        ], style={"display": "flex", "flexDirection": "column", "gap": "3px"}),

        html.Span("💡 Solid = Male · Dotted = Female", style={
            "fontSize": "11px", "color": "#999",
            "fontStyle": "italic", "marginLeft": "auto", "whiteSpace": "nowrap",
        }),

    ], style={
        "display": "flex", "alignItems": "center", "gap": "28px",
        "padding": "12px 28px", "background": "#fff",
        "borderBottom": "2px solid #e0e0e0",
        "boxShadow": "0 2px 6px rgba(0,0,0,0.07)",
        "flexWrap": "wrap",
    }),

    # ── Chart ─────────────────────────────────────────────────────────────
    html.Div(
        dcc.Graph(id="main-chart", config={"responsive": True},
                  style={"height": "78vh"}),
        style={"padding": "16px 24px", "background": "#f4f6f9"},
    ),

], style={"fontFamily": "'Segoe UI', Arial, sans-serif",
          "background": "#f4f6f9", "minHeight": "100vh"})


# ─────────────────────────────────────────────
# 4. CALLBACK  — rebuilds figure on every filter change
# ─────────────────────────────────────────────
@app.callback(
    Output("main-chart", "figure"),
    Input("subject-dd", "value"),
    Input("grade-dd",   "value"),
    Input("gender-dd",  "value"),
)
def update_chart(subject, grade, gender_sel):

    genders_to_show = ["Male", "Female"] if gender_sel == "both" else [gender_sel]
    gender_label    = "Male & Female"    if gender_sel == "both" else f"{gender_sel} only"

    sub = filt[
        (filt["SUBJECT"] == subject) &
        (filt["GRADE"]   == grade) &
        (filt["SUBGROUPDESCRIPTION"].isin(genders_to_show))
    ].copy()

    fig = go.Figure()

    for gender in genders_to_show:
        g_data = sub[sub["SUBGROUPDESCRIPTION"] == gender]
        suffix = "M" if gender == "Male" else "F"

        # District lines
        di = g_data[g_data["LEVEL"] == "DI"]
        for name, grp in di.groupby("NAME"):
            grp = grp.sort_values("YEAR")
            if grp.empty:
                continue
            fig.add_trace(go.Scatter(
                x=grp["YEAR"],
                y=grp["AVERAGESCALESCORE"],
                mode="lines+markers",
                name=f"{name} ({suffix})",
                legendgroup=f"{name}||{gender}",
                showlegend=True,
                line=dict(color=color_map.get(name, "#888"),
                          width=1.5, dash=gender_style[gender]["dash"]),
                marker=dict(size=5, color=color_map.get(name, "#888"),
                            symbol=gender_style[gender]["symbol"]),
                opacity=0.75,
                hovertemplate=(
                    f"<b>{name}</b><br>Gender: {gender}<br>"
                    f"Grade: {grade}<br>Year: %{{x}}<br>"
                    "Score: %{y:.1f}<extra></extra>"
                ),
            ))

        # State line
        st = g_data[g_data["LEVEL"] == "ST"].sort_values("YEAR")
        if not st.empty:
            fig.add_trace(go.Scatter(
                x=st["YEAR"],
                y=st["AVERAGESCALESCORE"],
                mode="lines+markers",
                name=f"State ({suffix})",
                legendgroup=f"State||{gender}",
                showlegend=True,
                line=dict(color="#E63946", width=3.5,
                          dash=gender_style[gender]["dash"]),
                marker=dict(size=10, color="#E63946",
                            symbol=gender_style[gender]["symbol"]),
                hovertemplate=(
                    f"<b>State Average</b><br>Gender: {gender}<br>"
                    f"Grade: {grade}<br>Year: %{{x}}<br>"
                    "Score: %{y:.1f}<extra></extra>"
                ),
            ))

    fig.update_layout(
        title=dict(
            text=(f"Nebraska NDE – Average Scale Score Over Years<br>"
                  f"<sup>{subject} | {gender_label} | Grade: {grade}</sup>"),
            font=dict(size=16),
        ),
        xaxis=dict(title="School Year", tickmode="array",
                   tickvals=tick_vals, ticktext=tick_texts),
        yaxis=dict(title="Average Scale Score"),
        hovermode="closest",
        legend=dict(
            title=("<b>District (M = Male solid, F = Female dotted)</b><br>"
                   "<sup>Click to toggle · Double-click to isolate</sup>"),
            bgcolor="rgba(255,255,255,0.92)",
            bordercolor="#ccc", borderwidth=1,
            groupclick="toggleitem",
        ),
        template="plotly_white",
        margin=dict(t=100, l=60, r=40, b=60),
    )

    return fig


# ─────────────────────────────────────────────
# 5. RUN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8050))
    app.run(host="0.0.0.0", port=port, debug=False)
