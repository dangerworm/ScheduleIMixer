using ScheduleI.Ui.Enums;

namespace ScheduleI.Ui.Extensions;

public static class EffectExtensions
{
    public static string ToDisplayName(this Effect ingredient) => ingredient switch
    {
        Effect.AntiGravity => "Anti-Gravity",
        Effect.BrightEyed => "Bright-Eyed",
        Effect.CalorieDense => "Calorie-Dense",
        Effect.LongFaced => "Long Faced",
        Effect.SeizureInducing => "Seizure-Inducing",
        Effect.ThoughtProvoking => "Thought-Provoking",
        Effect.TropicThunder => "Tropic Thunder",
        _ => ingredient.ToString()
    };
}