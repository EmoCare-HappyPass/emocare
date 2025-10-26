"""
Patient views.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Patient
from .serializers import PatientSerializer, PatientListSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """患者ViewSet"""

    queryset = Patient.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """患者ダッシュボードデータ取得"""
        patient = self.get_object()

        # TODO: Implement dashboard data aggregation
        dashboard_data = {
            'patient': PatientSerializer(patient).data,
            'recent_sessions': [],  # 最近の会話セッション
            'emotion_summary': {},  # 感情サマリー
            'active_alerts': [],  # アクティブなアラート
        }

        return Response(dashboard_data)
