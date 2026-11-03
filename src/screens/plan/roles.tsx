import { Warning } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppBar } from '@/components/app-bar';
import { Card } from '@/components/card';
import { ChipSelect } from '@/components/form';
import { HazardTabs } from '@/components/hazard-tabs';
import { Screen, SectionHeader } from '@/components/screen';
import { TierIcon } from '@/components/severity';
import { AppText } from '@/components/text';
import { newId } from '@/data/ids';
import { displayName } from '@/domain/members';
import { generatePlaybook } from '@/domain/playbook';
import { capableHelpers, helperTask, roleWarnings } from '@/domain/roles';
import { useHousehold } from '@/hooks/use-household';
import { usePriorities, useTopRiskHazard } from '@/hooks/use-priorities';
import type { Hazard, Task, Tier } from '@/models/types';
import { useSession } from '@/stores/session-store';
import { useTheme } from '@/theme/theme';

const NONE = 'none';

/** Roles and tasks per hazard (§15.4). Shared by drills and Emergency Mode. */
export function Roles({ initialHazard }: { initialHazard?: Hazard }) {
  const t = useTheme();
  const { snapshot, subjects } = useHousehold();
  const save = useSession((s) => s.save);
  const remove = useSession((s) => s.remove);
  const topRisk = useTopRiskHazard();
  const [hazard, setHazard] = useState<Hazard>(initialHazard ?? topRisk);
  const priorities = usePriorities(hazard);
  const now = useMemo(() => new Date(), []);
  if (!snapshot || !priorities) return null;

  const helpers = capableHelpers(snapshot, now);
  const options = [{ value: NONE, label: 'No one yet' }, ...helpers.map((m) => ({ value: m.id, label: displayName(m) }))];
  const needHelp = priorities.order.filter((o) => o.tier === 'critical' || o.tier === 'urgent');
  const general = generatePlaybook(snapshot, hazard, { priorities }).filter((s) => !s.subjectId && s.category !== 'recovery');
  const warnings = roleWarnings(snapshot.tasks, hazard, priorities.order, snapshot);

  const assign = async (match: (t: Task) => boolean, base: Omit<Task, 'id' | 'householdId' | 'createdAt' | 'updatedAt' | 'assignedMemberId'>, memberId: string) => {
    const existing = snapshot.tasks.find((x) => x.hazard === hazard && match(x));
    if (memberId === NONE) {
      if (existing) await remove('tasks', existing.id);
      return;
    }
    const nowIso = new Date().toISOString();
    await save('tasks', { ...(existing ?? { id: newId(), householdId: snapshot.household.id, createdAt: nowIso }), ...base, updatedAt: nowIso, assignedMemberId: memberId } as Task);
  };

  return (
    <Screen header={<AppBar title="Roles" back />}>
      <HazardTabs value={hazard} onChange={setHazard} topRisk={topRisk} />
      <AppText variant="body" secondary>
        Pick who helps each person, and who does each job. Names show on the steps in drills and emergencies.
      </AppText>
      {warnings.map((w) => (
        <View key={w} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Warning size={20} color={t.colors.severityImportant} weight="fill" />
          <AppText variant="body" style={{ flex: 1 }}>
            {w}
          </AppText>
        </View>
      ))}

      <SectionHeader title="Who helps whom" />
      {needHelp.length ? (
        needHelp.map((o) => (
          <Card key={o.subjectId}>
            <View style={{ gap: t.space.xs }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TierIcon tier={o.tier} size={18} />
                <AppText variant="headline">{subjects.get(o.subjectId)?.name}</AppText>
              </View>
              <ChipSelect
                label="Helper"
                value={helperTask(snapshot.tasks, hazard, o.subjectId)?.assignedMemberId ?? NONE}
                onChange={(v) => assign((x) => x.linkedSubjectId === o.subjectId, { hazard, title: `help:${o.subjectId}`, order: o.rank, linkedSubjectType: o.subjectType, linkedSubjectId: o.subjectId, tier: o.tier }, v)}
                options={options.filter((op) => op.value !== o.subjectId)}
              />
            </View>
          </Card>
        ))
      ) : (
        <AppText variant="body" secondary>
          No one needs a dedicated helper for this emergency.
        </AppText>
      )}

      <SectionHeader title="Jobs" />
      {general.map((s, i) => (
        <Card key={s.id}>
          <View style={{ gap: t.space.xs }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              {s.tier !== 'standard' ? <TierIcon tier={s.tier as Tier} size={18} /> : null}
              <AppText variant="body" style={{ flex: 1 }}>
                {s.instruction}
              </AppText>
            </View>
            <ChipSelect
              label="Who"
              value={snapshot.tasks.find((x) => x.hazard === hazard && x.title === s.id)?.assignedMemberId ?? NONE}
              onChange={(v) => assign((x) => x.title === s.id && !x.linkedSubjectId, { hazard, title: s.id, order: 100 + i, linkedSubjectType: null, linkedSubjectId: null, tier: s.tier }, v)}
              options={options}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
