"""
Conversation serializers.
"""

from rest_framework import serializers
from .models import ConversationSession


class ConversationSessionSerializer(serializers.ModelSerializer):
    """会話セッションシリアライザ"""

    patient_name = serializers.CharField(source='patient.name', read_only=True)
    emotion_name = serializers.CharField(source='emotion.name_ja', read_only=True)
    duration = serializers.ReadOnlyField()

    class Meta:
        model = ConversationSession
        fields = [
            'id', 'patient', 'patient_name', 'started_at', 'ended_at',
            'patient_text', 'ai_response_text', 'emotion', 'emotion_name',
            'emotion_reason', 'duration'
        ]
        read_only_fields = ['id', 'started_at', 'duration']
