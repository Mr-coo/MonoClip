import re

from fastapi import APIRouter

from app.models.schema import TranscriptionResponse


router = APIRouter(prefix="/caption", tags=["caption"])

BADWORDS = set([
    "anjing", "anjir", "anjrit", "asu", "bangsat", "bajingan", "brengsek",
    "kontol", "kntl", "memek", "mmk", "ngentot", "entot", "kentot",
    "tolol", "tll", "goblok", "gblk", "idiot", "bodoh", "dongo",
    "kampret", "keparat", "setan", "iblis",
    "tai", "taik", "taii", "tahi", "sialan",
    "jancok", "cok", "coklat", "cokkk", "cuk", "cukimay",
    "anjay", "anjayyy", "anjg", "ajg",
    "bangke", "bangkek", "bangsad",
    "pepek", "perek", "lonte", "pelacur",
    "bego", "bloon", "bahlul",
    "brengs", "brengsekkan",
    "sundal", "jalang",
    "ngentod", "ngntd",
    "bacot", "bacottt",
    "bacod", "bct",
    "tololll", "goblokk",
    "kimak", "kmak",
    "babi", "monyet", "kampungan",

    "fuck", "fucking", "fucker", "motherfucker", "mf",
    "shit", "shitty", "bullshit",
    "bitch", "bitches",
    "ass", "asshole", "dumbass", "jackass",
    "bastard", "bastards",
    "slut", "whore",
    "dick", "dicks", "dickhead",
    "cock", "cocksucker",
    "pussy",
    "cunt",
    "jerk", "jerkoff",
    "retard", "retarded",
    "moron", "idiot",
    "stupid", "dumb",
    "loser",
    "trash", "garbage",
    "scumbag",
    "pieceofshit",
    "sonofabitch",
    "wtf", "dafuq",
    "fck", "fk", "fuk",
    "sh1t", "b1tch",
    "a55hole", "shitting",

    "f*ck", "sh*t", "b*tch",
    "fucc", "fukkk", "fukk",
    "shiit", "shiiit",
    "betch", "biatch",
    "azzhole",
    "d1ck", "c0ck",
    "pu$$y",
    "4sshole"
])

BADWORD_PATTERN = re.compile(
    r"(?<!\w)(" + "|".join(re.escape(word) + r"\w*" for word in BADWORDS) + r")(?!\w)",
    re.IGNORECASE,
)


def mask_badwords(text: str) -> str:
	return BADWORD_PATTERN.sub("****", text)


@router.post(
    "/filter",
    response_model=TranscriptionResponse,
    summary="Filter profanity from captions",
    description="Masks profanity in caption segment texts using a rule-based word list (Bahasa Indonesia + English). Pass the full TranscriptionResponse from /transcribe.",
)
async def filter_badwords(payload: TranscriptionResponse) -> TranscriptionResponse:
    from app.models.schema import CaptionSegment
    return TranscriptionResponse(
        language=payload.language,
        segments=[
            CaptionSegment(
                id=segment.id,
                start=segment.start,
                end=segment.end,
                text=mask_badwords(segment.text),
            )
            for segment in payload.segments
        ],
    )
