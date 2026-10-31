"""Turn a single painted running pose into a 4-frame run cycle.

The body above `split` stays put; the legs below it are animated:
  0 stride (original)  1 passing (legs pulled together)  2 mirrored stride  3 passing
Frames are padded so the mirrored legs never clip. Works on the art-pixel image
(before the 2x upscale).
"""
from PIL import Image

PAD = 4


def _hip_x(img, row):
    xs = [x for x in range(img.width) if img.getpixel((x, row))[3] > 0]
    return (min(xs) + max(xs)) / 2 if xs else img.width / 2


def run_frames(img, split, hip_x=None, squeeze=0.45):
    w, h = img.width, img.height
    hip = hip_x if hip_x is not None else _hip_x(img, split - 1)
    top = img.crop((0, 0, w, split))
    legs = img.crop((0, split, w, h))

    def canvas():
        return Image.new('RGBA', (w + PAD * 2, h), (0, 0, 0, 0))

    def place(legs_img, dx=0, dy=0):
        c = canvas()
        c.paste(legs_img, (PAD + dx, split + dy), legs_img)
        c.paste(top, (PAD, dy), top)
        return c

    stride = place(legs)

    flipped = legs.transpose(Image.FLIP_LEFT_RIGHT)
    # mirror about the hip, not the image centre
    shift = round(2 * hip - (w - 1)) - 0
    mirror = place(flipped, dx=shift - 0)

    nw = max(1, round(w * squeeze))
    pinched = legs.resize((nw, legs.height), Image.NEAREST)
    pass_dx = round(hip - nw / 2)
    passing = canvas()
    passing.paste(pinched, (PAD + pass_dx, split - 1), pinched)
    passing.paste(top, (PAD, -1), top)

    return [stride, passing, mirror, passing]


def pose_frames(img, split, hip_x=None, squeeze=0.72):
    """[run0, run1, run2, run3, jump, duck] — all on the same padded canvas."""
    w, h = img.width, img.height
    hip = hip_x if hip_x is not None else _hip_x(img, split - 1)
    top = img.crop((0, 0, w, split))
    legs = img.crop((0, split, w, h))

    def canvas():
        return Image.new('RGBA', (w + PAD * 2, h), (0, 0, 0, 0))

    def compose(legs_img, legs_x, legs_y, top_y):
        c = canvas()
        c.paste(legs_img, (PAD + legs_x, legs_y), legs_img)
        c.paste(top, (PAD, top_y), top)
        return c

    stride = compose(legs, 0, split, 0)
    flipped = legs.transpose(Image.FLIP_LEFT_RIGHT)
    mirror = compose(flipped, round(2 * hip - (w - 1)), split, 0)

    # passing: legs drawn in under the hips, body rides 1px higher
    nw = max(1, round(w * squeeze))
    pinched = legs.resize((nw, legs.height), Image.NEAREST)
    passing = compose(pinched, round(hip - nw / 2), split - 1, -1)

    # jump: knees tucked up (legs shorter + narrower), body at full height
    jh = max(1, round(legs.height * 0.62))
    jw = max(1, round(w * 0.85))
    tucked = legs.resize((jw, jh), Image.NEAREST)
    jump = compose(tucked, round(hip - jw / 2), split, 0)

    # duck: torso drops into a deep crouch, legs squashed wide under it
    dh = max(1, round(legs.height * 0.45))
    dw = max(1, round(w * 1.05))
    crouch = legs.resize((dw, dh), Image.NEAREST)
    drop = legs.height - dh
    duck = compose(crouch, round(hip - dw / 2), h - dh, drop)
    # ride: seated pedal stroke — legs drawn under the hips, alternating extended / bent
    rw = max(1, round(w * 0.6))
    ride_ext = legs.resize((rw, legs.height), Image.NEAREST)
    ride_a = compose(ride_ext, round(hip - rw / 2), split, 0)
    bent = legs.transpose(Image.FLIP_LEFT_RIGHT).resize((rw, round(legs.height * 0.8)), Image.NEAREST)
    ride_b = compose(bent, round(hip - rw / 2), split, 0)
    return [stride, passing, mirror, passing, jump, duck, ride_a, ride_b]
