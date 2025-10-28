"""
Conversation views.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .models import ConversationSession
from .serializers import ConversationSessionSerializer


class ConversationSessionViewSet(viewsets.ModelViewSet):
    """会話セッションViewSet"""

    queryset = ConversationSession.objects.all()
    serializer_class = ConversationSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        params = self.request.query_params
        patient_id = params.get('patient_id')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        # Time range filters
        from_str = params.get('from')
        to_str = params.get('to')

        if from_str:
            dt_from = parse_datetime(from_str)
            if dt_from is not None:
                if timezone.is_naive(dt_from):
                    dt_from = timezone.make_aware(dt_from, timezone.get_current_timezone())
                queryset = queryset.filter(started_at__gte=dt_from)

        if to_str:
            dt_to = parse_datetime(to_str)
            if dt_to is not None:
                if timezone.is_naive(dt_to):
                    dt_to = timezone.make_aware(dt_to, timezone.get_current_timezone())
                queryset = queryset.filter(started_at__lte=dt_to)

        # Ordering
        order = params.get('order', 'desc').lower()
        if order not in ('asc', 'desc'):
            order = 'desc'
        queryset = queryset.order_by('started_at' if order == 'asc' else '-started_at')

        # Limit
        limit = params.get('limit')
        if limit:
            try:
                n = max(1, min(int(limit), 500))
                queryset = queryset[:n]
            except (TypeError, ValueError):
                # ignore invalid limit, return full queryset
                pass

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
