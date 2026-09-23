'use client';

import Autocomplete from '@mui/material/Autocomplete';
import FormLabel from '@mui/material/FormLabel';
import MuiTextField from '@mui/material/TextField';
import { useMemo, useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { formatMoney, localDateInput } from '../../../lib/format';
import {
  useAllStudents,
  useCourses,
  useGroups,
  useSavePayment,
  useStudentGroupLinks,
  type Payment,
  type PaymentInput,
} from '../api';
import { activeLinks } from '../derive';
import { Alert, Button, Dialog, SelectField, TextField, apiErrorMessage } from '../ui';
import { compact, required } from './validation';

type Props = { open: boolean; onClose: () => void; payment?: Payment; studentId?: number };

type Values = { student_id: string; group_id: string; amount: string; paid_at: string; note: string };

type Errors = Partial<Record<keyof Values, MessageKey>>;

function paidAtFromInput(value: string) {
  if (value === localDateInput(new Date())) return new Date().toISOString();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

export function PaymentFormDialog({ open, onClose, payment, studentId }: Props) {
  const { t, lang } = useI18n();
  const save = useSavePayment();
  const students = useAllStudents();
  const groups = useGroups();
  const courses = useCourses();

  const initialDate = localDateInput(payment ? new Date(payment.paid_at) : new Date());
  const [values, setValues] = useState<Values>({
    student_id: String(payment?.student_id ?? studentId ?? ''),
    group_id: payment?.group_id ? String(payment.group_id) : '',
    amount: payment ? String(payment.amount) : '',
    paid_at: initialDate,
    note: payment?.note ?? '',
  });
  const [groupTouched, setGroupTouched] = useState(Boolean(payment));
  const [errors, setErrors] = useState<Errors>({});

  const studentGroups = useStudentGroupLinks(
    { student_id: Number(values.student_id) || undefined },
    Boolean(values.student_id),
  );

  const studentOptions = useMemo(() => {
    const list = [...(students.data ?? [])];
    if (payment && !list.some((student) => student.id === payment.student_id)) {
      list.push({ ...payment.students } as (typeof list)[number]);
    }
    return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [students.data, payment]);

  const groupOptions = useMemo(() => {
    const ids = new Set(
      activeLinks(studentGroups.data)
        .filter((link) => String(link.student_id) === values.student_id)
        .map((link) => link.group_id),
    );
    if (payment?.group_id) ids.add(payment.group_id);
    return (groups.data ?? []).filter((group) => ids.has(group.id));
  }, [studentGroups.data, groups.data, values.student_id, payment]);

  const groupValue = groupTouched
    ? values.group_id
    : groupOptions.length === 1
      ? String(groupOptions[0].id)
      : values.group_id;

  const selectedGroup = groupOptions.find((group) => String(group.id) === groupValue);
  const coursePrice = selectedGroup && courses.data?.find((course) => course.id === selectedGroup.course_id)?.price;

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(values.amount);
    const found = compact<Errors>({
      student_id: required(values.student_id),
      amount: required(values.amount) ?? (Number.isInteger(amount) && amount >= 1 ? undefined : 'form.minOne'),
      paid_at: required(values.paid_at),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    const input: PaymentInput = {
      student_id: Number(values.student_id),
      amount,
      ...(groupValue && { group_id: Number(groupValue) }),
      ...(values.note.trim() && { note: values.note.trim() }),
      ...((!payment || values.paid_at !== initialDate) && { paid_at: paidAtFromInput(values.paid_at) }),
    };
    save.mutate({ id: payment?.id, input }, { onSuccess: onClose });
  }

  const amountHint = values.amount
    ? `${formatMoney(values.amount, lang)} ${lang === 'en' ? 'UZS' : lang === 'ru' ? 'сум' : "so'm"}`
    : coursePrice !== undefined
      ? t('field.coursePriceHint', { amount: formatMoney(coursePrice, lang) })
      : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(payment ? 'form.paymentEdit' : 'form.paymentCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="payment-form" loading={save.isPending}>
            {t(save.isPending ? 'common.saving' : 'common.save')}
          </Button>
        </>
      }
    >
      <form id="payment-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        {save.error && (
          <div className="sm:col-span-2">
            <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <FormLabel htmlFor="payment-student" className="mb-1.5 block">
            {t('field.student')}
          </FormLabel>
          <Autocomplete
            id="payment-student"
            size="small"
            options={studentOptions}
            loading={students.isPending}
            value={studentOptions.find((student) => String(student.id) === values.student_id) ?? null}
            onChange={(_, student) => {
              set('student_id', student ? String(student.id) : '');
              set('group_id', '');
              setGroupTouched(false);
            }}
            getOptionLabel={(student) => student.full_name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={({ key, ...props }, student) => (
              <li key={key} {...props}>
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="font-medium">{student.full_name}</span>
                  <span className="text-xs text-muted">{student.phone}</span>
                </div>
              </li>
            )}
            noOptionsText={t('search.empty')}
            loadingText={t('common.loading')}
            renderInput={(params) => (
              <MuiTextField
                {...params}
                placeholder={t('payments.searchPlaceholder')}
                error={Boolean(errors.student_id)}
                helperText={errors.student_id && t(errors.student_id)}
              />
            )}
          />
        </div>
        <SelectField
          label={t('field.group')}
          optional
          value={groupValue}
          disabled={!values.student_id}
          onChange={(e) => {
            setGroupTouched(true);
            set('group_id', e.target.value);
          }}
        >
          <option value="">{t('field.none')}</option>
          {groupOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t('field.paidAt')}
          type="date"
          max={localDateInput(new Date())}
          value={values.paid_at}
          onChange={(e) => set('paid_at', e.target.value)}
          error={errors.paid_at}
        />
        <div className="sm:col-span-2">
          <TextField
            label={t('field.amount')}
            type="number"
            min={1}
            step={1000}
            inputMode="numeric"
            placeholder="1200000"
            value={values.amount}
            onChange={(e) => set('amount', e.target.value)}
            error={errors.amount}
            hint={amountHint}
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            label={t('col.note')}
            optional
            maxLength={500}
            value={values.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
}
