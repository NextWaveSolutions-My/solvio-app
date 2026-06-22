// Plain (non-client) module so the timezone list can be imported by both
// Server and Client Components. Keeping it out of a "use client" file avoids
// the client-reference proxy that breaks array methods like .find in RSC.

export const TIMEZONES = [
  // GMT-12 to GMT-11
  { value: "Pacific/Kwajalein", label: "Kwajalein (GMT-12)" },
  { value: "Pacific/Midway", label: "Midway Island (GMT-11)" },
  { value: "Pacific/Niue", label: "Niue (GMT-11)" },
  { value: "Pacific/Pago_Pago", label: "Pago Pago (GMT-11)" },

  // GMT-10
  { value: "Pacific/Honolulu", label: "Honolulu (GMT-10)" },
  { value: "Pacific/Rarotonga", label: "Rarotonga (GMT-10)" },
  { value: "Pacific/Tahiti", label: "Tahiti (GMT-10)" },

  // GMT-9:30
  { value: "Pacific/Marquesas", label: "Marquesas (GMT-9:30)" },

  // GMT-9
  { value: "America/Anchorage", label: "Anchorage (GMT-9)" },
  { value: "America/Juneau", label: "Juneau (GMT-9)" },
  { value: "Pacific/Gambier", label: "Gambier (GMT-9)" },

  // GMT-8
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
  { value: "America/Vancouver", label: "Vancouver (GMT-8)" },
  { value: "America/Tijuana", label: "Tijuana (GMT-8)" },
  { value: "Pacific/Pitcairn", label: "Pitcairn (GMT-8)" },

  // GMT-7
  { value: "America/Denver", label: "Denver (GMT-7)" },
  { value: "America/Phoenix", label: "Phoenix (GMT-7)" },
  { value: "America/Edmonton", label: "Edmonton (GMT-7)" },
  { value: "America/Mazatlan", label: "Mazatlan (GMT-7)" },
  { value: "America/Chihuahua", label: "Chihuahua (GMT-7)" },

  // GMT-6
  { value: "America/Chicago", label: "Chicago (GMT-6)" },
  { value: "America/Mexico_City", label: "Mexico City (GMT-6)" },
  { value: "America/Winnipeg", label: "Winnipeg (GMT-6)" },
  { value: "America/Guatemala", label: "Guatemala (GMT-6)" },
  { value: "America/El_Salvador", label: "El Salvador (GMT-6)" },
  { value: "America/Costa_Rica", label: "Costa Rica (GMT-6)" },
  { value: "America/Tegucigalpa", label: "Tegucigalpa (GMT-6)" },
  { value: "Pacific/Galapagos", label: "Galapagos (GMT-6)" },

  // GMT-5
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "America/Toronto", label: "Toronto (GMT-5)" },
  { value: "America/Havana", label: "Havana (GMT-5)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Bogota", label: "Bogota (GMT-5)" },
  { value: "America/Panama", label: "Panama (GMT-5)" },
  { value: "America/Jamaica", label: "Jamaica (GMT-5)" },
  { value: "America/Guayaquil", label: "Guayaquil (GMT-5)" },
  { value: "Pacific/Easter", label: "Easter Island (GMT-5)" },

  // GMT-4
  { value: "America/Halifax", label: "Halifax (GMT-4)" },
  { value: "America/Caracas", label: "Caracas (GMT-4)" },
  { value: "America/La_Paz", label: "La Paz (GMT-4)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Barbados", label: "Barbados (GMT-4)" },
  { value: "America/Martinique", label: "Martinique (GMT-4)" },
  { value: "Atlantic/Bermuda", label: "Bermuda (GMT-4)" },

  // GMT-3:30
  { value: "America/St_Johns", label: "St. Johns (GMT-3:30)" },

  // GMT-3
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Montevideo", label: "Montevideo (GMT-3)" },
  { value: "America/Godthab", label: "Godthab (GMT-3)" },
  { value: "America/Cayenne", label: "Cayenne (GMT-3)" },
  { value: "America/Paramaribo", label: "Paramaribo (GMT-3)" },
  { value: "Atlantic/Stanley", label: "Stanley (GMT-3)" },

  // GMT-2
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
  { value: "Atlantic/South_Georgia", label: "South Georgia (GMT-2)" },

  // GMT-1
  { value: "Atlantic/Azores", label: "Azores (GMT-1)" },
  { value: "Atlantic/Cape_Verde", label: "Cape Verde (GMT-1)" },

  // GMT+0
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "Europe/Dublin", label: "Dublin (GMT+0)" },
  { value: "Europe/Lisbon", label: "Lisbon (GMT+0)" },
  { value: "Africa/Casablanca", label: "Casablanca (GMT+0)" },
  { value: "Africa/Accra", label: "Accra (GMT+0)" },
  { value: "Africa/Monrovia", label: "Monrovia (GMT+0)" },
  { value: "Atlantic/Reykjavik", label: "Reykjavik (GMT+0)" },

  // GMT+1
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "Europe/Rome", label: "Rome (GMT+1)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (GMT+1)" },
  { value: "Europe/Brussels", label: "Brussels (GMT+1)" },
  { value: "Europe/Vienna", label: "Vienna (GMT+1)" },
  { value: "Europe/Stockholm", label: "Stockholm (GMT+1)" },
  { value: "Europe/Copenhagen", label: "Copenhagen (GMT+1)" },
  { value: "Europe/Oslo", label: "Oslo (GMT+1)" },
  { value: "Europe/Warsaw", label: "Warsaw (GMT+1)" },
  { value: "Europe/Prague", label: "Prague (GMT+1)" },
  { value: "Europe/Budapest", label: "Budapest (GMT+1)" },
  { value: "Europe/Zurich", label: "Zurich (GMT+1)" },
  { value: "Europe/Belgrade", label: "Belgrade (GMT+1)" },
  { value: "Africa/Lagos", label: "Lagos (GMT+1)" },
  { value: "Africa/Algiers", label: "Algiers (GMT+1)" },
  { value: "Africa/Tunis", label: "Tunis (GMT+1)" },

  // GMT+2
  { value: "Europe/Helsinki", label: "Helsinki (GMT+2)" },
  { value: "Europe/Athens", label: "Athens (GMT+2)" },
  { value: "Europe/Bucharest", label: "Bucharest (GMT+2)" },
  { value: "Europe/Sofia", label: "Sofia (GMT+2)" },
  { value: "Europe/Riga", label: "Riga (GMT+2)" },
  { value: "Europe/Tallinn", label: "Tallinn (GMT+2)" },
  { value: "Europe/Vilnius", label: "Vilnius (GMT+2)" },
  { value: "Europe/Kiev", label: "Kiev (GMT+2)" },
  { value: "Africa/Cairo", label: "Cairo (GMT+2)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (GMT+2)" },
  { value: "Africa/Harare", label: "Harare (GMT+2)" },
  { value: "Africa/Maputo", label: "Maputo (GMT+2)" },
  { value: "Asia/Jerusalem", label: "Jerusalem (GMT+2)" },
  { value: "Asia/Beirut", label: "Beirut (GMT+2)" },
  { value: "Asia/Damascus", label: "Damascus (GMT+2)" },
  { value: "Asia/Amman", label: "Amman (GMT+2)" },

  // GMT+3
  { value: "Europe/Istanbul", label: "Istanbul (GMT+3)" },
  { value: "Europe/Moscow", label: "Moscow (GMT+3)" },
  { value: "Europe/Minsk", label: "Minsk (GMT+3)" },
  { value: "Africa/Nairobi", label: "Nairobi (GMT+3)" },
  { value: "Africa/Addis_Ababa", label: "Addis Ababa (GMT+3)" },
  { value: "Asia/Baghdad", label: "Baghdad (GMT+3)" },
  { value: "Asia/Kuwait", label: "Kuwait (GMT+3)" },
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
  { value: "Asia/Qatar", label: "Qatar (GMT+3)" },

  // GMT+3:30
  { value: "Asia/Tehran", label: "Tehran (GMT+3:30)" },

  // GMT+4
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Asia/Muscat", label: "Muscat (GMT+4)" },
  { value: "Asia/Baku", label: "Baku (GMT+4)" },
  { value: "Asia/Tbilisi", label: "Tbilisi (GMT+4)" },
  { value: "Asia/Yerevan", label: "Yerevan (GMT+4)" },
  { value: "Europe/Samara", label: "Samara (GMT+4)" },
  { value: "Indian/Mauritius", label: "Mauritius (GMT+4)" },
  { value: "Indian/Reunion", label: "Reunion (GMT+4)" },

  // GMT+4:30
  { value: "Asia/Kabul", label: "Kabul (GMT+4:30)" },

  // GMT+5
  { value: "Asia/Karachi", label: "Karachi (GMT+5)" },
  { value: "Asia/Tashkent", label: "Tashkent (GMT+5)" },
  { value: "Asia/Ashgabat", label: "Ashgabat (GMT+5)" },
  { value: "Asia/Dushanbe", label: "Dushanbe (GMT+5)" },
  { value: "Asia/Yekaterinburg", label: "Yekaterinburg (GMT+5)" },
  { value: "Indian/Maldives", label: "Maldives (GMT+5)" },

  // GMT+5:30
  { value: "Asia/Kolkata", label: "Kolkata (GMT+5:30)" },
  { value: "Asia/Colombo", label: "Colombo (GMT+5:30)" },

  // GMT+5:45
  { value: "Asia/Kathmandu", label: "Kathmandu (GMT+5:45)" },

  // GMT+6
  { value: "Asia/Dhaka", label: "Dhaka (GMT+6)" },
  { value: "Asia/Almaty", label: "Almaty (GMT+6)" },
  { value: "Asia/Bishkek", label: "Bishkek (GMT+6)" },
  { value: "Asia/Thimphu", label: "Thimphu (GMT+6)" },
  { value: "Asia/Omsk", label: "Omsk (GMT+6)" },
  { value: "Indian/Chagos", label: "Chagos (GMT+6)" },

  // GMT+6:30
  { value: "Asia/Yangon", label: "Yangon (GMT+6:30)" },
  { value: "Indian/Cocos", label: "Cocos Islands (GMT+6:30)" },

  // GMT+7
  { value: "Asia/Bangkok", label: "Bangkok (GMT+7)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh (GMT+7)" },
  { value: "Asia/Jakarta", label: "Jakarta (GMT+7)" },
  { value: "Asia/Phnom_Penh", label: "Phnom Penh (GMT+7)" },
  { value: "Asia/Vientiane", label: "Vientiane (GMT+7)" },
  { value: "Asia/Krasnoyarsk", label: "Krasnoyarsk (GMT+7)" },
  { value: "Indian/Christmas", label: "Christmas Island (GMT+7)" },

  // GMT+8
  { value: "Asia/Shanghai", label: "Shanghai (GMT+8)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (GMT+8)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Taipei", label: "Taipei (GMT+8)" },
  { value: "Asia/Manila", label: "Manila (GMT+8)" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (GMT+8)" },
  { value: "Asia/Macau", label: "Macau (GMT+8)" },
  { value: "Asia/Brunei", label: "Brunei (GMT+8)" },
  { value: "Asia/Irkutsk", label: "Irkutsk (GMT+8)" },
  { value: "Australia/Perth", label: "Perth (GMT+8)" },

  // GMT+8:45
  { value: "Australia/Eucla", label: "Eucla (GMT+8:45)" },

  // GMT+9
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Asia/Seoul", label: "Seoul (GMT+9)" },
  { value: "Asia/Pyongyang", label: "Pyongyang (GMT+9)" },
  { value: "Asia/Yakutsk", label: "Yakutsk (GMT+9)" },
  { value: "Asia/Dili", label: "Dili (GMT+9)" },
  { value: "Pacific/Palau", label: "Palau (GMT+9)" },

  // GMT+9:30
  { value: "Australia/Adelaide", label: "Adelaide (GMT+9:30)" },
  { value: "Australia/Darwin", label: "Darwin (GMT+9:30)" },

  // GMT+10
  { value: "Australia/Sydney", label: "Sydney (GMT+10)" },
  { value: "Australia/Melbourne", label: "Melbourne (GMT+10)" },
  { value: "Australia/Brisbane", label: "Brisbane (GMT+10)" },
  { value: "Australia/Hobart", label: "Hobart (GMT+10)" },
  { value: "Pacific/Guam", label: "Guam (GMT+10)" },
  { value: "Pacific/Port_Moresby", label: "Port Moresby (GMT+10)" },
  { value: "Pacific/Chuuk", label: "Chuuk (GMT+10)" },
  { value: "Asia/Vladivostok", label: "Vladivostok (GMT+10)" },

  // GMT+10:30
  { value: "Australia/Lord_Howe", label: "Lord Howe Island (GMT+10:30)" },

  // GMT+11
  { value: "Pacific/Guadalcanal", label: "Guadalcanal (GMT+11)" },
  { value: "Pacific/Noumea", label: "Noumea (GMT+11)" },
  { value: "Pacific/Pohnpei", label: "Pohnpei (GMT+11)" },
  { value: "Pacific/Kosrae", label: "Kosrae (GMT+11)" },
  { value: "Pacific/Norfolk", label: "Norfolk Island (GMT+11)" },
  { value: "Asia/Magadan", label: "Magadan (GMT+11)" },

  // GMT+12
  { value: "Pacific/Auckland", label: "Auckland (GMT+12)" },
  { value: "Pacific/Fiji", label: "Fiji (GMT+12)" },
  { value: "Pacific/Tarawa", label: "Tarawa (GMT+12)" },
  { value: "Pacific/Majuro", label: "Majuro (GMT+12)" },
  { value: "Pacific/Nauru", label: "Nauru (GMT+12)" },
  { value: "Pacific/Funafuti", label: "Funafuti (GMT+12)" },
  { value: "Pacific/Wake", label: "Wake Island (GMT+12)" },
  { value: "Pacific/Wallis", label: "Wallis (GMT+12)" },
  { value: "Asia/Kamchatka", label: "Kamchatka (GMT+12)" },

  // GMT+12:45
  { value: "Pacific/Chatham", label: "Chatham Islands (GMT+12:45)" },

  // GMT+13
  { value: "Pacific/Tongatapu", label: "Tongatapu (GMT+13)" },
  { value: "Pacific/Apia", label: "Apia (GMT+13)" },
  { value: "Pacific/Fakaofo", label: "Fakaofo (GMT+13)" },

  // GMT+14
  { value: "Pacific/Kiritimati", label: "Kiritimati (GMT+14)" },
] as const;
