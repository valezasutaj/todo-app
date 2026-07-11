import jenkins.model.*
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition
import hudson.plugins.git.GitSCM
import hudson.plugins.git.BranchSpec
import hudson.plugins.git.UserRemoteConfig

def instance = Jenkins.get()
def jobName = "todo-app"

if (instance.getItem(jobName) == null) {
    def job = instance.createProject(WorkflowJob, jobName)

    def userRemoteConfigs = [new UserRemoteConfig("https://github.com/valezasutaj/todo-app.git", null, null, null)]
    def branches = [new BranchSpec("*/master")]
    def scm = new GitSCM(userRemoteConfigs, branches, null, null, Collections.emptyList())

    job.setDefinition(new CpsScmFlowDefinition(scm, "Jenkinsfile"))
    job.save()
}

instance.save()
