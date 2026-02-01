#!/usr/bin/env python3
"""
Tag extraction module for emergency call transcripts.
Extracts the top 3 most meaningful words from transcripts using NLTK.
Supports both English and Turkish languages.
"""

import re
from typing import List
from collections import Counter

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.tag import pos_tag
except ImportError:
    nltk = None
    print("Warning: NLTK not installed. Tag extraction will return empty lists.")

# Turkish stopwords (NLTK doesn't have Turkish stopwords)
TURKISH_STOPWORDS = {
    've', 'ile', 'bu', 'bir', 'de', 'da', 'için', 'mi', 'mı', 'mu', 'mü',
    'ama', 'fakat', 'ancak', 'yalnız', 'çünkü', 'ki', 'eğer', 'ya', 'veya',
    'hem', 'ne', 'nasıl', 'neden', 'nerede', 'nereden', 'nereye', 'ne zaman',
    'hangi', 'hangisi', 'kim', 'kime', 'kimin', 'kiminle', 'şu', 'o', 'ben',
    'sen', 'biz', 'siz', 'onlar', 'benim', 'senin', 'bizim', 'sizin', 'onların',
    'var', 'yok', 'değil', 'evet', 'hayır', 'belki', 'tamam', 'olur', 'olmaz',
    'gibi', 'kadar', 'daha', 'çok', 'az', 'en', 'her', 'hiç', 'bazı', 'tüm',
    'bütün', 'hep', 'artık', 'henüz', 'hala', 'yine', 'gene', 'asla', 'sadece'
}

# Emergency-related keywords that should be prioritized (bilingual)
PRIORITY_KEYWORDS = {
    # English emergency words
    'emergency', 'help', 'urgent', 'critical', 'trapped', 'injured', 'fire',
    'earthquake', 'collapse', 'building', 'rescue', 'ambulance', 'bleeding',
    'unconscious', 'breathing', 'heart', 'attack', 'accident', 'disaster',
    'evacuation', 'danger', 'explosion', 'flood', 'gas', 'leak', 'medical',

    # Turkish emergency words
    'acil', 'yardım', 'imdat', 'kritik', 'mahsur', 'yaralı', 'yangın',
    'deprem', 'çöküntü', 'enkaz', 'bina', 'kurtarma', 'ambulans', 'kanama',
    'baygın', 'nefes', 'kalp', 'krizi', 'kaza', 'afet', 'felaket',
    'tahliye', 'tehlike', 'patlama', 'sel', 'gaz', 'kaçak', 'tıbbi', 'doktor',
    'hastane', 'göçük', 'yıkım', 'enkaz', 'kayıp', 'ölü', 'can', 'kırık'
}


def download_nltk_resources():
    """Download required NLTK resources if not already present."""
    if nltk is None:
        return False

    try:
        # Check if resources are already downloaded
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('corpora/stopwords')
        nltk.data.find('taggers/averaged_perceptron_tagger')
    except LookupError:
        # Download required resources
        print("Downloading NLTK resources...")
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
        nltk.download('averaged_perceptron_tagger', quiet=True)
        print("NLTK resources downloaded.")

    return True


def extract_tags(transcript: str, language: str = "en", num_tags: int = 3) -> List[str]:
    """
    Extract the top N most meaningful words from a transcript.

    Args:
        transcript: The text to extract tags from
        language: Language code ('en' for English, 'tr' for Turkish)
        num_tags: Number of tags to extract (default: 3)

    Returns:
        List of extracted tags (words)
    """
    if not transcript or nltk is None:
        return []

    # Ensure NLTK resources are available
    if not download_nltk_resources():
        return []

    # Convert to lowercase and remove special characters
    text = transcript.lower()
    text = re.sub(r'[^\w\s]', ' ', text)

    # Tokenize
    try:
        tokens = word_tokenize(text)
    except:
        # Fallback to simple split if tokenization fails
        tokens = text.split()

    # Get stopwords based on language
    if language == 'tr':
        stop_words = TURKISH_STOPWORDS
    else:
        try:
            stop_words = set(stopwords.words('english'))
        except:
            stop_words = set()

    # Filter out stopwords and short words
    meaningful_words = [
        word for word in tokens
        if word not in stop_words and len(word) > 2
    ]

    # If English, use POS tagging to prioritize nouns and verbs
    # But always keep priority keywords regardless of POS tag
    if language == 'en' and meaningful_words:
        try:
            pos_tagged = pos_tag(meaningful_words)
            # Keep nouns (NN*), verbs (VB*), and priority keywords
            meaningful_words = [
                word for word, pos in pos_tagged
                if pos.startswith('NN') or pos.startswith('VB') or word in PRIORITY_KEYWORDS
            ]
        except:
            pass  # If POS tagging fails, use all meaningful words

    # Score words based on frequency and priority
    word_scores = Counter()

    for word in meaningful_words:
        # Base score is frequency
        score = meaningful_words.count(word)

        # Boost score if word is in priority keywords
        if word in PRIORITY_KEYWORDS:
            score *= 3

        word_scores[word] = score

    # Get top N words
    top_words = [word for word, _ in word_scores.most_common(num_tags)]

    # If we don't have enough words, add priority keywords from the text
    if len(top_words) < num_tags:
        for word in tokens:
            if word in PRIORITY_KEYWORDS and word not in top_words:
                top_words.append(word)
                if len(top_words) >= num_tags:
                    break

    return top_words[:num_tags]


def extract_bilingual_tags(transcript: str, num_tags: int = 3) -> List[str]:
    """
    Extract tags from a transcript that might contain both English and Turkish.
    Tries to detect the dominant language and extract accordingly.

    Args:
        transcript: The text to extract tags from
        num_tags: Number of tags to extract (default: 3)

    Returns:
        List of extracted tags
    """
    if not transcript:
        return []

    # Count Turkish-specific characters to detect language
    turkish_chars = set('ğüşıöçĞÜŞİÖÇ')
    turkish_char_count = sum(1 for char in transcript if char in turkish_chars)

    # Also check for Turkish words
    turkish_word_indicators = ['bir', 've', 'için', 'bu', 'de', 'da', 'ile']
    turkish_word_count = sum(1 for word in turkish_word_indicators if word in transcript.lower())

    # Determine language (simple heuristic)
    # >= 1 Turkish char or >= 2 Turkish indicator words suggests Turkish
    if turkish_char_count >= 1 or turkish_word_count >= 2:
        language = 'tr'
    else:
        language = 'en'

    return extract_tags(transcript, language, num_tags)


# Initialize NLTK resources when module is imported
if nltk:
    download_nltk_resources()