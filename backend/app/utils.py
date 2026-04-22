import random
import string


def generate_friend_code() -> str:
    chars = string.ascii_uppercase + string.digits
    part1 = "".join(random.choices(chars, k=5))
    part2 = "".join(random.choices(chars, k=5))
    return f"{part1}-{part2}"
