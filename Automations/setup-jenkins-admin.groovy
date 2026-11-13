import jenkins.model.Jenkins
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy

// Enable security
def instance = Jenkins.getInstance()

// Create first admin user
def realm = new HudsonPrivateSecurityRealm(false)
instance.setSecurityRealm(realm)

// Create admin user if it doesn't exist
if (!realm.getUser("admin")) {
    def user = realm.createAccount("admin", "a156b927b4ff4692add4530c81f8da65")
    user.save()
}

// Set authorization strategy
instance.setAuthorizationStrategy(new FullControlOnceLoggedInAuthorizationStrategy())
instance.save()

println("Jenkins security configured successfully!")
println("Admin user created: admin / a156b927b4ff4692add4530c81f8da65")
