using System.ComponentModel;
using System.Text.Json.Serialization;


namespace ScheduleI.Ui.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<Product>))]
public enum Product
{
    [Description("OG Kush")]
    [JsonStringEnumMemberName("OG Kush")]
    OGKush,

    [Description("Sour Diesel")]
    [JsonStringEnumMemberName("Sour Diesel")]
    SourDiesel,

    [Description("Green Crack")]
    [JsonStringEnumMemberName("Green Crack")]
    GreenCrack,

    [Description("Granddaddy Purple")]
    [JsonStringEnumMemberName("Granddaddy Purple")]
    GranddaddyPurple,

    Methamphetamine,

    Cocaine
}
