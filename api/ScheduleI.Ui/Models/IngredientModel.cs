using System.Text;
using System.Text.Json.Serialization;
using ScheduleI.Ui.Enums;
using ScheduleI.Ui.Extensions;

namespace ScheduleI.Ui.Models;

public class IngredientModel
{
    private Dictionary<Effect, Effect>? _transformationsDict = null;

    [JsonPropertyName("name")]
    public required Ingredient Name { get; set; }

    [JsonPropertyName("price")]
    public required int Price { get; set; }

    [JsonPropertyName("rankRequirement")]
    public string? RankRequirement { get; set; }

    [JsonPropertyName("baseEffect")]
    public required Effect BaseEffect { get; set; }

    [JsonPropertyName("transformations")]
    public required IEnumerable<TransformationModel> Transformations { get; set; }

    public Dictionary<Effect, Effect> TransformationsDict => _transformationsDict ?? BuildTransformations();

    public string GetDetails()
    {
        var details = new StringBuilder();

        details.AppendLine($"{Name.ToDisplayName()} (${Price})");
        details.AppendLine();
        details.AppendLine($"{BaseEffect.ToDisplayName()}");
        details.AppendLine();
        foreach(var transformation in Transformations)
        {
            details.AppendLine($"{transformation.From.ToDisplayName()} -> {transformation.To.ToDisplayName()}");
        }

        return details.ToString();
    }

    public override string ToString()
    {
        return Name.ToDisplayName();
    }

    private Dictionary<Effect, Effect> BuildTransformations()
    {
        _transformationsDict = Transformations
            .ToDictionary(t => t.From, t => t.To);

        return _transformationsDict;
    }
}
