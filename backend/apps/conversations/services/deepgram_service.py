"""
Deepgram STT/TTS Service using Deepgram API.
"""

import base64
import os
import requests
from django.conf import settings


class DeepgramService:
    """Deepgram API wrapper for STT and TTS"""

    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1"

    def transcribe(self, audio_data):
        """
        音声データをテキストに変換（STT）

        Args:
            audio_data (bytes): 音声データ（バイナリ）

        Returns:
            tuple: (transcribed_text, confidence)
        """
        url = f"{self.base_url}/listen"
        
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "audio/webm"
        }
        
        params = {
            "model": "nova-2",
            "language": "ja",
            "punctuate": "true",
            "utterances": "true"
        }

        try:
            response = requests.post(
                url,
                headers=headers,
                params=params,
                data=audio_data,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Extract transcript and confidence
            alternatives = result.get('results', {}).get('channels', [{}])[0].get('alternatives', [{}])
            if alternatives:
                transcript = alternatives[0].get('transcript', '')
                confidence = alternatives[0].get('confidence', 0.0)
                return transcript, confidence
            
            return '', 0.0
            
        except requests.exceptions.RequestException as e:
            print(f"Deepgram STT Error: {e}")
            return '', 0.0

    def text_to_speech(self, text):
        """
        テキストを音声に変換（TTS）

        Args:
            text (str): 音声化するテキスト

        Returns:
            bytes: 音声データ（MP3形式）
        """
        url = f"{self.base_url}/speak"
        
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json"
        }
        
        params = {
            "model": "aura-asteria-ja"  # Japanese voice model
        }
        
        payload = {
            "text": text
        }

        try:
            response = requests.post(
                url,
                headers=headers,
                params=params,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            # Return audio binary data
            return response.content
            
        except requests.exceptions.RequestException as e:
            print(f"Deepgram TTS Error: {e}")
            return b''
