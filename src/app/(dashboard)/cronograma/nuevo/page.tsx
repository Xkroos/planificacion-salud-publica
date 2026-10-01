import { redirect } from 'next/navigation'

export default function NuevoCronogramaRedirect() {
  redirect('/cronograma?nuevo=true')
}
