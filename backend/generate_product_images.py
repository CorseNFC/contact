"""Generate ultra-premium NFC product mockups via Gemini Nano Banana."""
import asyncio
import base64
import os
from pathlib import Path
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv(Path(__file__).parent / ".env")

OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "products"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PROMPTS = {
    "prestige": (
        "Ultra-premium product photography of a matte black metal NFC business card, "
        "the size of a credit card, minimalist, no visible text or logo on it, "
        "subtle brushed metal texture visible on the surface, a small embossed circular "
        "NFC chip on the right side, resting at a slight 30 degree angle on a light beige "
        "linen fabric background, soft studio lighting from top-left with warm rim light, "
        "shallow depth of field, luxurious editorial magazine aesthetic, high-end catalog "
        "photography, 4k, cinematic, no branding, no writing"
    ),
    "plaque": (
        "Ultra-premium product photography of a small circular brushed metal NFC sticker "
        "or plaque, about 35mm diameter, satin silver aluminum finish with visible fine "
        "brushed pattern, subtle NFC symbol embossed in the center, placed at a slight angle "
        "on a matte concrete surface, soft directional studio lighting, delicate shadow, "
        "editorial luxury tech aesthetic, minimalist composition, no text, no logo, 4k, cinematic"
    ),
    "medaillon": (
        "Ultra-premium product photography of a small elegant NFC keychain medallion in "
        "champagne brushed gold color, oval shape, about 30mm, held by a thin titanium ring, "
        "resting on a dark walnut wood surface with soft warm morning light, subtle bokeh in "
        "background, luxury lifestyle photography, minimalist, sophisticated, no visible text "
        "or logo, only smooth brushed metal surface with a subtle circular embossed detail, 4k"
    ),
}


async def generate_one(name: str, prompt: str):
    api_key = os.environ["EMERGENT_LLM_KEY"]
    chat = LlmChat(
        api_key=api_key,
        session_id=f"kt-product-{name}",
        system_message="You are a premium product photography AI.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=prompt)
    _, images = await chat.send_message_multimodal_response(msg)
    if not images:
        raise RuntimeError(f"No image returned for {name}")
    b = base64.b64decode(images[0]["data"])
    out = OUT_DIR / f"{name}.png"
    out.write_bytes(b)
    print(f"OK {out} ({len(b)//1024} KB)")


async def main():
    await asyncio.gather(*[generate_one(n, p) for n, p in PROMPTS.items()])


if __name__ == "__main__":
    asyncio.run(main())
