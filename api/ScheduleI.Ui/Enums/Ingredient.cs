using System.Text.Json.Serialization;

namespace ScheduleI.Ui.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<Ingredient>))]
public enum Ingredient
{
    Addy,

    Banana,

    Battery,

    Chili,

    Cuke,

    Donut,

    [JsonStringEnumMemberName("Energy Drink")]
    EnergyDrink,

    [JsonStringEnumMemberName("Flu Medicine")]
    FluMedicine,

    Gasoline,

    [JsonStringEnumMemberName("Horse Semen")]
    HorseSemen,

    Iodine,

    [JsonStringEnumMemberName("Mega Bean")]
    MegaBean,

    [JsonStringEnumMemberName("Motor Oil")]
    MotorOil,

    [JsonStringEnumMemberName("Mouth Wash")]
    MouthWash,

    Paracetamol,

    Viagor
}