const getTopicPrompt = `You are expert in detecting and extracting topics from text.

You will be given a note content. Your task is to extract the main topics from the content.
Return a single line of text easily understandable by a human and suitable for displaying as a quick preview or recap on a notes app homepage.
The topics should be concise, clear, and relevant to the content of the note.

Return only the generated text. No explanations or additional comments allowed.`

export default getTopicPrompt;