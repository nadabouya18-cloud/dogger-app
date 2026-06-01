const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      if (!supabase) {
        setError('Configuration manquante — contactez le support');
        setLoading(false);
        return;
      }

      // 1. Créer le compte auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
          }
        }
      });

      if (authError) {
        setError(authError.message.includes('already registered')
          ? 'Cet email est déjà utilisé — connectez-vous'
          : authError.message);
        setLoading(false);
        return;
      }

      if (!data?.user?.id) {
        setError('Erreur lors de la création du compte — réessayez');
        setLoading(false);
        return;
      }

      // 2. Attendre que la session soit active
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Insérer le chien avec l'ID du nouvel utilisateur
      const { error: dogError } = await supabase.from('dogs').insert({
        owner_id: data.user.id,
        name: form.dogName,
        breed: form.dogBreed,
        size: form.dogSize,
        gender: form.dogGender,
        age: form.dogAge,
        notes: form.dogNotes,
        photo_url: form.dogPhoto,
      });

      if (dogError) console.error('Dog error:', dogError.message);

      setStep(3);
    } catch (e) {
      console.error(e);
      setError('Une erreur est survenue — réessayez');
    } finally {
      setLoading(false);
    }
  };
