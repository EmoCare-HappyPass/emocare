"""
Conversation views.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import ConversationSession
from .serializers import ConversationSessionSerializer


class ConversationSessionViewSet(viewsets.ModelViewSet):
    """会話セッションViewSet"""

    queryset = ConversationSession.objects.all()
    serializer_class = ConversationSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    @action(detail=False, methods=['post'])
    def start(self, request):
        """会話セッション開始"""
        patient_id = request.data.get('patient_id')

        if not patient_id:
            return Response(
                {'error': 'patient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        session = ConversationSession.objects.create(
            patient_id=patient_id,
            started_at=timezone.now()
        )

        serializer = self.get_serializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """会話セッション終了"""
        session = self.get_object()
        session.ended_at = timezone.now()
        session.save()

        serializer = self.get_serializer(session)
        return Response(serializer.data)
