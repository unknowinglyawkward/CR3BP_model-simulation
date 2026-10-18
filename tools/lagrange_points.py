import numpy as np
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from scipy.optimize import brentq

def distances(x, y, mu):
    return np.hypot(x + mu, y), np.hypot(x - 1 + mu, y)

def omega(x, y, mu):
    r1, r2 = distances(x, y, mu)
    return 0.5 * (x**2 + y**2) + (1 - mu) / r1 + mu / r2

def collinear_equation(x, mu):
    r1, r2 = abs(x + mu), abs(x - 1 + mu)
    return x - (1 - mu) * (x + mu) / r1**3 - mu * (x - 1 + mu) / r2**3

def lagrange_points(mu):
    eps = 1e-9
    x1 = brentq(collinear_equation, -mu + eps, 1 - mu - eps, args=(mu,))
    x2 = brentq(collinear_equation, 1 - mu + eps, 1 - mu + 5, args=(mu,))
    x3 = brentq(collinear_equation, -mu - 5, -mu - eps, args=(mu,))
    return np.array([[x1, 0], [x2, 0], [x3, 0],
                     [0.5 - mu, np.sqrt(3) / 2],
                     [0.5 - mu, -np.sqrt(3) / 2]])

def plot_lagrange_points(mu, limit=1.8):
    pts = lagrange_points(mu)

    axis = np.linspace(-limit, limit, 1000)
    x, y = np.meshgrid(axis, axis)
    r1, r2 = distances(x, y, mu)
    U = omega(x, y, mu)
    U[(r1 < 0.02) | (r2 < 0.02)] = np.nan

    # Potential field: white (low) -> deep blue (high)
    field_levels = np.quantile(U[np.isfinite(U)], np.linspace(0.0, 0.93, 60))

    fig, ax = plt.subplots(figsize=(10, 7), constrained_layout=True)
    cf = ax.contourf(x, y, U, levels=field_levels, cmap="Blues", extend="max")
    ax.contour(x, y, U, levels=field_levels[::4], colors="#1f3a5f",
               linewidths=0.3, alpha=0.35)
    fig.colorbar(cf, ax=ax, location="bottom", shrink=0.7, pad=0.03,
                 label="Effective potential Ω")

    # Critical zero-velocity curves: Ω equal to its value at L1, L2, L3
    crit = [
        (omega(*pts[0], mu), "#d9552b", "Ω at L1"),
        (omega(*pts[1], mu), "#e0a526", "Ω at L2"),
        (omega(*pts[2], mu), "#2f8f5b", "Ω at L3"),
    ]
    handles = []
    for level, colour, name in crit:
        ax.contour(x, y, U, levels=[level], colors=colour, linewidths=1)
        handles.append(Line2D([], [], color=colour, lw=2,
                              label=f"{name}  ({level:.4f})"))

    # Primaries
    ax.scatter(-mu, 0, c="#f6c445", s=150, edgecolor="k", zorder=5)
    ax.scatter(1 - mu, 0, c="#5b6fd6", s=70, edgecolor="k", zorder=5)
    handles += [
        Line2D([], [], marker="o", ls="", mfc="#f6c445", mec="k",
               ms=10, label="Primary"),
        Line2D([], [], marker="o", ls="", mfc="#5b6fd6", mec="k",
               ms=7, label="Secondary"),
    ]

    # Lagrange points
    for i, (px, py) in enumerate(pts, start=1):
        ax.scatter(px, py, c="white", s=45, edgecolor="k", zorder=6)
        ax.annotate(f"L{i}", (px, py), xytext=(7, 6),
                    textcoords="offset points", fontsize=10, fontweight="bold")
        handles.append(Line2D([], [], marker="o", ls="", mfc="white",
                              mec="k", ms=7,
                              label=f"L{i}  ({px:+.4f}, {py:+.4f})"))

    ax.set_xlim(-limit, limit)
    ax.set_ylim(-limit, limit)
    ax.set_aspect("equal")
    ax.set_xlabel("x")
    ax.set_ylabel("y")
    ax.set_title(f"Lagrange points and zero-velocity curves, μ = {mu}")

    ax.legend(handles=handles, loc="upper left", bbox_to_anchor=(1.02, 1),
              frameon=False, fontsize=9, title="Index")
    plt.show()

plot_lagrange_points(mu=0.25)