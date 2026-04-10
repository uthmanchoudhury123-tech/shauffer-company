import { SignupClient } from './SignupClient'

interface Props {
  searchParams: Promise<{ invite?: string; email?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const { invite, email } = await searchParams
  return <SignupClient inviteToken={invite} inviteEmail={email} />
}
