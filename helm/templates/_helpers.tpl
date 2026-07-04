{{- define "demo-apipatterns-chart.fullname" -}}
{{- printf "%s" .Release.Name -}}
{{- end -}}

{{- define "demo-apipatterns-chart.selectorLabels" -}}
app: {{ include "demo-apipatterns-chart.fullname" . | quote }}
{{- end -}}

{{- define "demo-apipatterns-chart.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- end -}}

{{- define "demo-apipatterns-chart.postgresFullname" -}}
{{- printf "%s-postgres" (include "demo-apipatterns-chart.fullname" .) -}}
{{- end -}}

{{- define "demo-apipatterns-chart.mysqlFullname" -}}
{{- printf "%s-mysql" (include "demo-apipatterns-chart.fullname" .) -}}
{{- end -}}

{{- define "demo-apipatterns-chart.sqliteFullname" -}}
{{- printf "%s-sqlite" (include "demo-apipatterns-chart.fullname" .) -}}
{{- end -}}

{{- define "demo-apipatterns-chart.appFullname" -}}
{{- printf "%s-app" (include "demo-apipatterns-chart.fullname" .) -}}
{{- end -}}

{{- define "demo-apipatterns-chart.appEnv" -}}
- name: PORT
  value: {{ index .Values "gql-app" "service" "port" | quote }}
- name: PGHOST
  value: {{ include "demo-apipatterns-chart.postgresFullname" . | quote }}
- name: PGPORT
  value: {{ .Values.postgres.port | quote }}
- name: PGUSER
  valueFrom:
    secretKeyRef:
      name: {{ include "demo-apipatterns-chart.postgresFullname" . }}
      key: POSTGRES_USER
- name: PGPASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "demo-apipatterns-chart.postgresFullname" . }}
      key: POSTGRES_PASSWORD
- name: PGDATABASE
  valueFrom:
    secretKeyRef:
      name: {{ include "demo-apipatterns-chart.postgresFullname" . }}
      key: POSTGRES_DB
- name: MYSQL_HOST
  value: {{ include "demo-apipatterns-chart.mysqlFullname" . | quote }}
- name: MYSQL_PORT
  value: {{ .Values.mysql.port | quote }}
- name: MYSQL_USER
  valueFrom:
    secretKeyRef:
      name: {{ include "demo-apipatterns-chart.mysqlFullname" . }}
      key: MYSQL_USER
- name: MYSQL_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "demo-apipatterns-chart.mysqlFullname" . }}
      key: MYSQL_PASSWORD
- name: MYSQL_DATABASE
  valueFrom:
    secretKeyRef:
      name: {{ include "demo-apipatterns-chart.mysqlFullname" . }}
      key: MYSQL_DATABASE
- name: SQLITE_MOUNT_PATH
  value: {{ .Values.sqlite.mountPath | quote }}
- name: SQLITE_DB_FILE
  value: {{ .Values.sqlite.dbFile | quote }}
{{- if (index .Values "gql-app" "env") }}
{{- toYaml (index .Values "gql-app" "env") | nindent 0 }}
{{- end }}
{{- end -}}

{{- define "demo-apipatterns-chart.appImage" -}}
{{- if (index .Values "gql-app" "image") -}}
{{- index .Values "gql-app" "image" -}}
{{- else -}}
{{- printf "image-registry.openshift-image-registry.svc:5000/%s/%s:%s" .Release.Namespace .Values.imageStream.name .Values.imageStream.tag -}}
{{- end -}}
{{- end -}}
