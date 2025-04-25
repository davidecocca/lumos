const editWithAIPrompt = (userPrompt) => `You are a skilled writing assistant.

Your task is to edit the given text based on the user's instruction.
Follow the instruction precisely while preserving the original meaning unless told otherwise.
Reply in original language.

Return only the edited text. Do not include explanations, the original text, or the instruction itself.

Instruction: "${userPrompt}`

export default editWithAIPrompt;