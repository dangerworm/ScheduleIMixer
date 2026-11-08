using System.Text.Json.Serialization;

namespace ScheduleI.Ui.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<Effect>))]
public enum Effect
{
    [JsonStringEnumMemberName("Anti-Gravity")]
    AntiGravity,

    Athletic,

    Balding,

    [JsonStringEnumMemberName("Bright-Eyed")]
    BrightEyed,

    Calming,

    [JsonStringEnumMemberName("Calorie-Dense")]
    CalorieDense,

    Cyclopean,

    Disorienting,

    Electrifying,

    Energizing,

    Euphoric,

    Explosive,

    Focused,

    Foggy,

    Gingeritis,

    Glowing,

    Jennerising,

    Laxative,

    [JsonStringEnumMemberName("Long Faced")]
    LongFaced,

    Munchies,

    Paranoia,

    Refreshing,

    Schizophrenic,

    Sedating,

    [JsonStringEnumMemberName("Seizure-Inducing")]
    SeizureInducing,

    Shrinking,

    Slippery,

    Smelly,

    Sneaky,

    Spicy,

    [JsonStringEnumMemberName("Thought-Provoking")]
    ThoughtProvoking,

    Toxic,

    [JsonStringEnumMemberName("Tropic Thunder")]
    TropicThunder,

    Zombifying
}