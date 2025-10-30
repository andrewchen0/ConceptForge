import ollama
from typing import Generator, Optional, Dict

print(ollama.list())


# model configuration
MODEL = "phi4-mini-reasoning:3.8b"
DEFAULT_OPTS: Dict = {
    "temperature": 0.5
}


# create ollama client
CLIENT = ollama.Client()


# default prompts
TEMPLATES = [
    "You are a concise tutor. Prioritize explaining how and why things work using low-level, step-by-step logical reasoning and intuition.",
    "Make the majority of your response an intuitive deep dive into the core concept only.",
    "Use equations sparingly and only when they are essential to the intuition; if used, explain every symbol and show how the equation follows from the logic.",
    "Focus on making your line of reasoning very clear, and use a simple and understandable tone.",
    "Do not rush to move on to another tangentially related topic. Stick to only the core concept.",
    "Make sure that you explain why every single step happens, and assume the user does not have prior knowledge beyond basic concepts.",
    "Only connect with previous responses and topics if they are strictly relevant to the current question.",
    "IMPORTANT: Do not spend too much time thinking. If you do, stop and produce your answer based on what you have so far.",
    "Only use () and [] for inline and display math. Do not use any other math delimiters, like $."
]


def build_prompt(user_text: str) -> str:

    # include the default prompts
    directives = "\n".join(TEMPLATES)
    
    # if the user wants a scenario, add other prompts
    if "__SCENARIO__" in user_text:
        # treat everything after as conversation history
        after = user_text.split("__SCENARIO__", 1)[1].strip()
        SCENARIO_TEMPLATES = [
            "Scenario Instructions:",
            "Only output the following:",
            "SCENARIO:",
            "one or two short paragraphs that describes a single, self-contained hypothetical situation for conceptual exploration",
            "QUESTION:",
            "exactly one short sentence that invites the user to think; do not provide any answer or hint",
            "Do not include any additional commentary, analysis, hints, derivations, or answers.",
            "Do not ask and then answer your own follow-up questions.",
            "Do not include numerical calculations unless absolutely necessary; prefer qualitative description and theoreticals.",
            "Do not take too long on thinking. Produce only the scenario.",
            "Keep the scenario focused, single-headed (only one core phenomenon), and accessible to a beginner.",
        ]

        SCENARIO_INSTRUCTIONS = "\n".join(SCENARIO_TEMPLATES) + "\n"

        # add conversation history
        history_section = f"Conversation history:\n{after}\n\n" if after else ""
        return f"{directives}\n\n{SCENARIO_INSTRUCTIONS}{history_section}"

    # include history if provided
    if "__HISTORY__" in user_text:
        after = user_text.split("__HISTORY__", 1)[1]
        
        # if there is a separator, split history and prompt
        if "\n--USER_PROMPT--\n" in after:
            history_part, prompt_part = after.split("\n--USER_PROMPT--\n", 1)
            history_section = f"Conversation history:\n{history_part.strip()}\n\n" if history_part and history_part.strip() else ""
            user_prompt = prompt_part.strip()
            return f"{directives}\n\n{history_section}User: {user_prompt}\n"
        else:
            # if none, rest is history
            history_section = f"Conversation history:\n{after.strip()}\n\n" if after and after.strip() else ""
            return f"{directives}\n\n{history_section}User: \n"

    return f"{directives}\n\nUser: {user_text}\n"


def generate_stream(user_text: str) -> Generator[str, None, None]:

    # Compose the prompt unless caller passed a full prompt
    prompt = build_prompt(user_text)

    opts = DEFAULT_OPTS.copy()
    # change configuration for scenario generation
    if "__SCENARIO__" in user_text:
        opts.update({"temperature": 0.1, "max_tokens": 400})

    for event in CLIENT.generate(model=MODEL, prompt=prompt, stream=True, options=opts):
        text = event.get("response")
        yield text


def generate_model_stream(prompt_text: str):
    for chunk in generate_stream(prompt_text):
        yield chunk
