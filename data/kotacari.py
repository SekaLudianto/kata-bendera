import re
from collections import Counter

VOWELS = set("AEIOU")

def load_cities_from_ts(path="cities.ts"):
    """
    Membaca file cities.ts dan mengambil name + region.
    Format:
    { name: "Adonara", region: "Nusa Tenggara Timur" },
    """
    cities = []
    pattern = re.compile(r'name:\s*"([^"]+)"\s*,\s*region:\s*"([^"]+)"')

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            m = pattern.search(line)
            if m:
                name = m.group(1).strip().upper()
                region = m.group(2).strip()
                cities.append((name, region))

    return cities


def is_possible_city(scramble, city):
    """
    Scramble = huruf city + 3 vokal.
    """
    c_scramble = Counter(scramble)
    c_city = Counter(city)

    if len(scramble) != len(city) + 3:
        return False

    for letter, count in c_city.items():
        if c_scramble[letter] < count:
            return False

    leftover = c_scramble - c_city
    extra = list(leftover.elements())

    return len(extra) == 3 and all(ch in VOWELS for ch in extra)


def solve_scramble(scramble, cities):
    scramble = scramble.replace(" ", "").upper()
    results = []

    for name, region in cities:
        if is_possible_city(scramble, name.replace(" ", "")):
            results.append((name, region))

    return results


# ---------------------------------------------------
#                     MAIN LOOP
# ---------------------------------------------------

if __name__ == "__main__":
    cities = load_cities_from_ts("cities.ts")

    print("Ketik 'exit' untuk keluar.\n")

    while True:
        scramble = input("Masukkan scramble: ").strip()
        if scramble.lower() == "exit":
            break

        matches = solve_scramble(scramble, cities)

        print("Hasil:")
        if matches:
            for name, region in matches:
                print(f"- {name.title()} ({region})")
        else:
            print("Tidak ada kota yang cocok.")

        print()
