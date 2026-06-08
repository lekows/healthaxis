# Segurança & LGPD — Fluxo Médico ↔ Paciente

> Matriz de políticas RLS, funções SECURITY DEFINER, riscos e checklist de conformidade LGPD.
> Cláusulas SQL citadas verbatim dos arquivos em `supabase/`.

## Objetivo

Documentar a superfície de segurança do fluxo médico-paciente e mapear os controles
de proteção de dados pessoais e sensíveis (dados de saúde) frente à LGPD.

## Modelo de autorização

Toda autorização é aplicada no **banco (RLS)**, e o painel do médico adiciona um
**guard de aplicação** como defesa em profundidade. O vínculo ativo é definido por
`doctor_patient_links` com `revoked_at is null`.

## Matriz de políticas RLS

### `profiles`
| Política | Tipo | Cláusula |
|---|---|---|
| `doctor reads linked patient profiles` | SELECT | `exists (… doctor_id = auth.uid() and patient_id = profiles.id and revoked_at is null)` |
| `patient reads linked doctor profiles` | SELECT | `exists (… patient_id = auth.uid() and doctor_id = profiles.id and revoked_at is null)` |
| *(perfil próprio)* | ALL | `auth.uid() = id` |

### `doctor_profiles`
| Política | Tipo | Cláusula |
|---|---|---|
| `doctor owns own profile` | ALL | `using (auth.uid() = id) with check (auth.uid() = id)` |
| `patient reads doctor profile` | SELECT | `using (true)` |

### `doctor_invites`
| Política | Tipo | Cláusula |
|---|---|---|
| `doctor manages own invites` | ALL | `using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id)` |

### `doctor_patient_links`
| Política | Tipo | Cláusula |
|---|---|---|
| `doctor sees own patients` | SELECT | `auth.uid() = doctor_id` |
| `patient sees own links` | SELECT | `auth.uid() = patient_id` |
| `patient revokes own links` | UPDATE | `auth.uid() = patient_id` |
| `patient accepts invite` | INSERT | `with check (auth.uid() = patient_id)` |

### `doctor_watched_biomarkers`
| Política | Tipo | Cláusula |
|---|---|---|
| `doctor manages watched biomarkers` | ALL | `using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id)` |
| `patient reads watched biomarkers` | SELECT | `auth.uid() = patient_id` |

### `shared_exam_tokens`
| Política | Tipo | Cláusula |
|---|---|---|
| `patient manages own tokens` | ALL | `using (auth.uid() = patient_id) with check (auth.uid() = patient_id)` |
| `linked doctor reads shared token` | SELECT | `auth.uid() = doctor_id or exists (… doctor_id = auth.uid() and patient_id = shared_exam_tokens.patient_id and revoked_at is null)` |

### Dados clínicos do paciente (`supabase/doctor-read-linked-patient-data.sql`)
Mesmo padrão de SELECT para o médico vinculado em: `biomarkers`, `biomarker_history`,
`documents`, `medications`, `family_history`, `timeline_events`, `preventive_reminders`,
`health_scores`. Exemplo (biomarkers):

```sql
create policy "doctor reads linked patient biomarkers"
  on public.biomarkers for select
  using (
    exists (
      select 1 from public.doctor_patient_links
      where doctor_patient_links.doctor_id = auth.uid()
        and doctor_patient_links.patient_id = biomarkers.user_id
        and doctor_patient_links.revoked_at is null
    )
  );
```

> O acesso do médico é **somente SELECT** e cessa assim que `revoked_at` deixa de ser nulo.
> O paciente continua sendo dono dos dados (`auth.uid() = user_id`) para todas as operações.

## Funções SECURITY DEFINER

Rodam como dono da função, **contornando RLS** — usadas onde o solicitante pode ser anônimo.

### `resolve_doctor_invite(p_token text)`
- **Retorna:** `doctor_id, doctor_name, crm, crm_uf, specialty`.
- **Filtros:** `expires_at > now()` e `used_at is null`.
- **Grant:** `anon, authenticated`.
- **Por que é seguro:** só expõe dados públicos mínimos do médico, apenas para tokens
  válidos e não usados; não retorna nada de paciente.

### `resolve_shared_token(p_token text)`
- **Retorna:** `patient_id, patient_name, document_ids, expires_at`.
- **Filtros:** `expires_at > now()` e `revoked_at is null`.
- **Grant:** `anon, authenticated`.
- **Por que é seguro:** limitado a tokens de compartilhamento de exame ativos e à lista
  de documentos que o paciente escolheu compartilhar.

## Riscos & mitigações

| Risco | Severidade | Mitigação atual |
|---|---|---|
| Link/QR de convite vaza | Média | Expiração 30 dias + uso único (`used_at`) + login para vincular |
| RPC expõe dados do médico a anônimo | Baixa | Conjunto mínimo (nome, CRM, especialidade); só para token válido |
| RPC de exame expõe dados do paciente | Média | Restrito a documentos selecionados e token ativo/não revogado |
| Papel `doctor` sem downgrade | Baixa | Comportamento atual observado — sem rota de reversão |
| Revogação não apaga dados | Baixa | Por design — corta acesso, preserva histórico do paciente |
| Token em query string da URL de convite | Média | É um identificador de convite, não credencial de sessão; expira e é uso único |

## Checklist LGPD

- [x] **Consentimento com registro (Art. 7º, I):** `consent_at` gravado no aceite; aviso na tela.
- [x] **Finalidade explícita:** tela de aceite lista o que o médico passa a ver.
- [x] **Revogação a qualquer tempo:** `POST /api/doctor/revoke`, restrito ao paciente.
- [x] **Minimização de dados:** médico tem apenas SELECT; RPCs retornam campos mínimos.
- [x] **Controle pelo titular:** compartilhamento de exames é explícito (`shared_exam_tokens`), nada automático.
- [ ] **Retenção/expurgo:** não há política automática de expurgo de vínculos/convites revogados (avaliar).
- [ ] **Trilha de auditoria:** `revoked_by`/`used_by`/timestamps existem; avaliar log centralizado de acessos do médico.

## Critérios de aceite

- [ ] Toda tabela de dados do paciente tem RLS que exige vínculo ativo para leitura do médico.
- [ ] Nenhuma RLS concede ao médico INSERT/UPDATE/DELETE sobre dados clínicos do paciente.
- [ ] RPCs SECURITY DEFINER filtram por validade (expiração/uso/revogação).
- [ ] Revogação remove o acesso do médico em todas as tabelas.

## Checklist de QA de segurança

- [ ] Médico vinculado **lê** biomarcadores/exames do paciente; **não consegue editar**.
- [ ] Após revogação, qualquer SELECT do médico aos dados do paciente retorna vazio.
- [ ] Médico A não vê dados de paciente vinculado ao médico B.
- [ ] Chamar `resolve_doctor_invite` com token expirado/usado retorna vazio.
- [ ] Paciente não consegue revogar vínculo de outro paciente (RLS por `patient_id`).
