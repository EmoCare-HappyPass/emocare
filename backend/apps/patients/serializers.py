"""
Patient serializers.
"""

from rest_framework import serializers
from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    """患者シリアライザ"""

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_code', 'name', 'birth_date', 'gender',
            'admission_date', 'department', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PatientListSerializer(serializers.ModelSerializer):
    """患者一覧用シリアライザ"""

    class Meta:
        model = Patient
        fields = ['id', 'patient_code', 'name', 'department', 'admission_date']
